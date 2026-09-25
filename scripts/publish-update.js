const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let supabaseUrl = process.env.SUPABASE_URL || 'https://ibkyzgxqbxletnwildrm.supabase.co';
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const apkPath = process.env.APK_PATH;
const versionTag = process.env.VERSION_TAG || 'v1.0.0';
const releaseNotes = process.env.RELEASE_NOTES || 'Nueva actualización disponible.';

async function getServiceKey() {
  if (supabaseKey) return supabaseKey;
  
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const projectId = process.env.SUPABASE_PROJECT_ID || 'ibkyzgxqbxletnwildrm';
  
  if (token) {
    console.log('Consultando Management API de Supabase para obtener service_role key...');
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}/api-keys`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        const keyObj = data.find(k => k.name === 'service_role' || k.tags === 'service_role');
        if (keyObj && keyObj.api_key) {
          console.log('✅ service_role key obtenida exitosamente.');
          return keyObj.api_key;
        }
      }
    } catch (err) {
      console.warn('No se pudo obtener la llave via Management API:', err.message);
    }
  }
  return null;
}

async function publishUpdate() {
  try {
    if (!apkPath || !fs.existsSync(apkPath)) {
      throw new Error(`No se encontró el archivo APK en la ruta: ${apkPath}`);
    }

    supabaseKey = await getServiceKey();
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Faltan las credenciales de Supabase (SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY).');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`Iniciando publicación de la versión ${versionTag}...`);

    // El build_number debe coincidir exactamente con el versionCode compilado en el
    // APK (ver android/app/build.gradle -PversionCode y el paso "Build Android APK"
    // del workflow) para que AppUpdateService.getCurrentBuild() y este valor puedan
    // compararse sin desincronizarse.
    const versionCodeEnv = process.env.VERSION_CODE;
    if (!versionCodeEnv) {
      throw new Error('Falta VERSION_CODE — debe ser el mismo run number usado para compilar el APK.');
    }
    const nextBuildNumber = parseInt(versionCodeEnv, 10);
    console.log(`Build number asignado (VERSION_CODE de CI): ${nextBuildNumber}`);

    // 2. Subir el APK al Storage
    const fileName = `update-${versionTag}-b${nextBuildNumber}.apk`;
    const fileBuffer = fs.readFileSync(apkPath);
    
    console.log(`Subiendo ${fileName} al bucket 'releases'...`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('releases')
      .upload(fileName, fileBuffer, {
        contentType: 'application/vnd.android.package-archive',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Error al subir el APK: ${uploadError.message}`);
    }
    
    console.log('APK subido con éxito:', uploadData.path);

    // 3. Registrar la actualización en la base de datos
    console.log('Registrando actualización en app_updates...');
    const { error: insertError } = await supabase
      .from('app_updates')
      .insert({
        version: versionTag.replace('refs/tags/', ''), // Limpiar si viene directo de github ref
        build_number: nextBuildNumber,
        release_notes: releaseNotes,
        force_update: false, // Por defecto falso, se puede cambiar manual si es crítico
        apk_path: uploadData.path
      });

    if (insertError) {
      throw new Error(`Error al registrar en BD: ${insertError.message}`);
    }

    console.log(`¡Publicación completada exitosamente! La actualización ${versionTag} (build ${nextBuildNumber}) ya está disponible para los usuarios.`);

    // 4. Limpieza automática de versiones antiguas (retener solo las últimas 3)
    console.log('Verificando versiones antiguas para limpieza de storage...');
    const MAX_RETAINED_VERSIONS = 3;
    const { data: allUpdates, error: listError } = await supabase
      .from('app_updates')
      .select('id, apk_path, build_number')
      .order('build_number', { ascending: false });

    if (!listError && allUpdates && allUpdates.length > MAX_RETAINED_VERSIONS) {
      const oldUpdates = allUpdates.slice(MAX_RETAINED_VERSIONS);
      const filesToDelete = oldUpdates.map(u => u.apk_path).filter(Boolean);
      const idsToDelete = oldUpdates.map(u => u.id);

      console.log(`Eliminando ${filesToDelete.length} APK(s) antiguos del storage:`, filesToDelete);
      if (filesToDelete.length > 0) {
        await supabase.storage.from('releases').remove(filesToDelete);
      }
      await supabase.from('app_updates').delete().in('id', idsToDelete);
      console.log('✅ Limpieza de storage completada.');
    }
    
  } catch (err) {
    console.error('Falló la publicación:', err);
    process.exit(1);
  }
}

publishUpdate();
