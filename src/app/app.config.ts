import { ApplicationConfig, importProvidersFrom, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCl from '@angular/common/locales/es-CL';

registerLocaleData(localeEsCl, 'es-CL');

import { provideRouter, withComponentInputBinding, RouteReuseStrategy } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { MessageService, ConfirmationService } from 'primeng/api';
import {
  LucideAngularModule,
  // ── Boilerplate (dashboard, kpi-card, sidebar, alert-card) ──
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart2,
  CheckCircle,
  Dumbbell,
  Zap,
  Target,
  Bot,
  Sparkles,
  ChevronRight,
  Download,
  LayoutDashboard,
  Plus,
  Settings,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  // ── Shell support (topbar, login, mobile drawer) ──
  Bell,
  LogOut,
  Menu,
  Search,
  X,
  // ── Acciones comunes ──
  Check,
  Edit,
  Pencil,
  Info,
  Trash2,
  // ── Navegación ──
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Home,
  Layers,
  // ── Contenido ──
  Calendar,
  Clock,
  FileText,
  FolderOpen,
  Image,
  Upload,
  Camera,
  PackageOpen,
  // ── Acciones extendidas ──
  Copy,
  Eye,
  EyeOff,
  Filter,
  MoreHorizontal,
  MoreVertical,
  RefreshCw,
  Save,
  Share2,
  // ── Comunicación ──
  Mail,
  MessageCircle,
  Mic,
  MicOff,
  Send,
  // ── Estado ──
  Ban,
  Circle,
  HelpCircle,
  Loader,
  ShieldCheck,
  Star,
  Tag,
  XCircle,
  // ── Tema ──
  Moon,
  Sun,
  List,
  ListChecks,
  // ── Entrenamiento ──
  ClipboardList,
  Play,
  Brain,
  Loader2,
  CircleAlert,
} from 'lucide-angular';

import { routes } from './app.routes';
import { provideCoreAuth } from '@core/auth/provide-core-auth';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

/**
 * Configuración principal de la aplicación.
 *
 * provideCoreAuth() ya incluye provideHttpClient(withInterceptors([authInterceptor])).
 * NO añadas provideHttpClient() por separado o se duplicará.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: LOCALE_ID, useValue: 'es-CL' },
    provideRouter(routes, withComponentInputBinding()),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.fake-dark-mode',
          cssLayer: {
            name: 'primeng',
            order: 'tailwind-base, primeng, tailwind-utilities',
          },
        },
      },
    }),
    provideCoreAuth(),
    MessageService,
    ConfirmationService,
    /**
     * Lucide Icons — Set curado SaaS (~48 íconos).
     *
     * Incluye los íconos del boilerplate + un set genérico para features SaaS.
     * Para añadir más: importar de 'lucide-angular' y agregar al objeto.
     * Referencia: https://lucide.dev/icons
     * Guía de iconos del DS: skills/design-system/SKILL.md
     */
    importProvidersFrom(
      LucideAngularModule.pick({
        // Boilerplate (dashboard, kpi-card, sidebar, alert-card)
        Activity,
        AlertCircle,
        AlertTriangle,
        ArrowRight,
        BarChart2,
        CheckCircle,
        Dumbbell,
        Zap,
        Target,
        Bot,
        Sparkles,
        ChevronRight,
        Download,
        LayoutDashboard,
        Plus,
        Settings,
        TrendingDown,
        TrendingUp,
        User,
        Users,
        // Shell support
        Bell,
        LogOut,
        Menu,
        Search,
        X,
        // Acciones comunes
        Check,
        Edit,
        Pencil,
        Info,
        Trash2,
        // Navegación
        ArrowLeft,
        ChevronDown,
        ChevronLeft,
        ChevronUp,
        Home,
        Layers,
        // Contenido
        Calendar,
        Clock,
        FileText,
        FolderOpen,
        Image,
        Upload,
        Camera,
        PackageOpen,
        // Acciones extendidas
        Copy,
        Eye,
        EyeOff,
        Filter,
        MoreHorizontal,
        MoreVertical,
        RefreshCw,
        Save,
        Share2,
        // Comunicación
        Mail,
        MessageCircle,
        Send,
        Mic,
        MicOff,
        // Estado
        Ban,
        Circle,
        HelpCircle,
        Loader,
        ShieldCheck,
        Star,
        Tag,
        XCircle,
        // Tema
        Moon,
        Sun,
        List,
        ListChecks,
        // Entrenamiento
        ClipboardList,
        Play,
        Brain,
        Loader2,
        CircleAlert,
      }),
    ),
    provideIonicAngular({}),
  ],
};
