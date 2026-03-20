import React, { useState, useEffect, lazy, Suspense, useRef } from "react";
import {
  ViewType,
  Client,
  Project,
  TeamMember,
  Transaction,
  Package,
  AddOn,
  TeamProjectPayment,
  Profile,
  FinancialPocket,
  TeamPaymentRecord,
  Lead,
  User,
  Card,
  ClientFeedback,
  NavigationAction,
  Notification,
  PromoCode,
  CardType,
  PaymentStatus,
  TransactionType,
  Contract,
} from "./types";
import {
  darkenColor,
  hexToHsl,
  NAV_ITEMS,
} from "./constants";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ErrorBoundary from "./components/ErrorBoundary";
// Keep lightweight/core components imported normally
import GlobalSearch from "./components/GlobalSearch";
const Homepage = lazy(() => import("./components/Homepage"));
const Login = lazy(() => import("./components/Login"));
const ChecklistPortal = lazy(() => import("./components/ChecklistPortal"));
// Lazy-load route components to enable real code-splitting and avoid dynamic/static import conflicts
const Dashboard = lazy(() => import("./components/Dashboard"));
const Leads = lazy(() =>
  import("./components/Leads").then((m) => ({ default: m.Leads })),
);
const Booking = lazy(() => import("./components/Booking"));
const Clients = lazy(() => import("./components/Clients"));
const Projects = lazy(() =>
  import("./components/Projects").then((m) => ({ default: m.Projects })),
);
const Freelancers = lazy(() =>
  import("./components/Freelancers").then((m) => ({ default: m.Freelancers })),
);
const Finance = lazy(() => import("./components/Finance"));
const Packages = lazy(() => import("./components/Packages"));
const Settings = lazy(() => import("./components/Settings"));
const CalendarView = lazy(() =>
  import("./components/CalendarView").then((m) => ({
    default: m.CalendarView,
  })),
);
const ClientReports = lazy(() => import("./components/ClientKPI"));
const ClientPortal = lazy(() => import("./components/ClientPortal"));
const FreelancerPortal = lazy(() => import("./components/FreelancerPortal"));
// Social Planner removed
const PromoCodes = lazy(() => import("./components/PromoCodes"));
const GalleryUpload = lazy(() => import("./components/GalleryUpload"));
const PublicGallery = lazy(() => import("./components/PublicGallery"));
const PublicBookingForm = lazy(() => import("./components/PublicBookingForm"));
const PublicPackages = lazy(() => import("./components/PublicPackages"));
const PublicFeedbackForm = lazy(
  () => import("./components/PublicFeedbackForm"),
);

const Contracts = lazy(() => import("./components/Contracts"));
const PublicLeadForm = lazy(() => import("./components/PublicLeadForm"));
const SuggestionForm = lazy(() => import("./components/SuggestionForm"));
const TestSignature = lazy(() => import("./components/TestSignature"));
const PublicInvoice = lazy(() => import("./components/PublicInvoice"));
const PublicReceipt = lazy(() => import("./components/PublicReceipt"));
const PublicContract = lazy(() => import("./components/PublicContract"));
import { listPromoCodes } from "./services/promoCodes";
import { listCards as listCardsFromDb } from "./services/cards";
import { listPackages } from "./services/packages";
import { listAddOns } from "./services/addOns";
import { listProjectsWithRelations } from "./services/projects";
import { updateProject as updateProjectInDb } from "./services/projects";
import { getProfile as getProfileFromDb } from "./services/profile";
import { useAppData } from "./hooks/useAppData";
import { DataLoadingWrapper } from "./components/LoadingState";
import { listAllTeamPayments } from "./services/teamProjectPayments";
import { listUsers as listUsersFromDb } from "./services/users";
import { listLeads as listLeadsFromDb } from "./services/leads";
import { listClientFeedback as listClientFeedbackFromDb } from "./services/clientFeedback";
import {
  createTransaction,
  updateCardBalance,
  updateTransaction as updateTransactionInDb,
} from "./services/transactions";
import { listTeamPaymentRecords as listTeamPaymentRecordsFromDb, createTeamPaymentRecord } from "./services/teamPaymentRecords";
import { listPockets as listPocketsFromDb } from "./services/pockets";
import { markSubStatusConfirmed } from "./services/projectSubStatusConfirmations";
import { listContracts } from "./services/contracts";

import { supabase } from "./lib/supabaseClient";
import { createNotification as createNotificationRow } from "./services/notifications";

// Remove usePersistentState to avoid hook-related confusion
const LAST_ROUTE_STORAGE_KEY = "vena-lastRoute";

const AccessDenied: React.FC<{ onBackToDashboard: () => void }> = ({
  onBackToDashboard,
}) => (
  <div
    className="
        flex flex-col items-center justify-center 
        h-full 
        text-center 
        p-4 sm:p-6 md:p-8
        animate-fade-in
    "
  >
    <div
      className="
            w-32 h-32 sm:w-40 sm:h-40
            flex items-center justify-center
            mb-4 sm:mb-6
        "
    >
      <img
        src="/assets/images/backgrounds/errorimg.svg"
        alt="Akses Ditolak"
        className="w-full h-full object-contain"
      />
    </div>
    <h2
      className="
            text-xl sm:text-2xl 
            font-bold 
            text-red-600 
            mb-2 sm:mb-3
        "
    >
      Akses Ditolak
    </h2>
    <p
      className="
            text-brand-text-secondary 
            mb-6 sm:mb-8 
            max-w-md
            leading-relaxed
        "
    >
      Anda tidak memiliki izin untuk mengakses halaman ini.
    </p>
    <button onClick={onBackToDashboard} className="button-primary">
      Kembali ke Dashboard
    </button>
  </div>
);

const LoadingFallback: React.FC = () => (
    <div className="flex flex-col items-center justify-center py-20">
        <div className="relative flex justify-center items-center">
            <div className="absolute border-4 border-brand-accent/20 rounded-full w-12 h-12"></div>
            <div className="animate-spin border-4 border-transparent border-t-brand-accent rounded-full w-12 h-12"></div>
        </div>
    </div>
);

const BottomNavBar: React.FC<{
  activeView: ViewType;
  handleNavigation: (view: ViewType) => void;
  currentUser: User | null;
}> = ({ activeView, handleNavigation, currentUser }) => {
  const prefetchView = (view: ViewType) => {
    switch (view) {
      case ViewType.DASHBOARD:
        import("./components/Dashboard");
        break;
      case ViewType["Calon Pengantin"]:
        import("./components/Leads");
        break;
      case ViewType.BOOKING:
        import("./components/Booking");
        break;
      case ViewType.CLIENTS:
        import("./components/Clients");
        break;
      case ViewType.PROJECTS:
        import("./components/Projects");
        break;
      case ViewType.TEAM:
        import("./components/Freelancers");
        break;
      case ViewType.FINANCE:
        import("./components/Finance");
        break;
      case ViewType.CALENDAR:
        import("./components/CalendarView");
        break;
      case ViewType.PACKAGES:
        import("./components/Packages");
        break;
      case ViewType.PROMO_CODES:
        import("./components/PromoCodes");
        break;
      case ViewType.GALLERY:
        import("./components/GalleryUpload");
        break;
      case ViewType.CLIENT_REPORTS:
        import("./components/ClientKPI");
        break;
      case ViewType.SETTINGS:
        import("./components/Settings");
        break;
      case ViewType.CONTRACTS:
        import("./components/Contracts");
        break;
      default:
        break;
    }
  };

  // Filter NAV_ITEMS sama persis seperti sidebar: Admin lihat semua, Member lihat sesuai permissions
  const navItems = React.useMemo(() => {
    if (!currentUser) return NAV_ITEMS;
    if (currentUser.role === 'Admin') return NAV_ITEMS;
    const memberPermissions = new Set(currentUser.permissions || []);
    return NAV_ITEMS.filter(item => memberPermissions.has(item.view));
  }, [currentUser]);

  return (
    <nav
      className="
            bottom-nav 
            xl:hidden
            bg-brand-surface/95 
            backdrop-blur-xl
            border-t border-brand-border/50
        "
    >
      <div
        className="flex items-center h-16 overflow-x-auto scrollbar-none"
        style={{
          paddingBottom: "var(--safe-area-inset-bottom, 0px)",
          paddingLeft: "4px",
          paddingRight: "4px",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => handleNavigation(item.view)}
            onMouseEnter={() => prefetchView(item.view)}
            style={{ scrollSnapAlign: "start", flexShrink: 0 }}
            className={`
                            flex flex-col items-center justify-center 
                            h-full
                            px-3 py-2
                            rounded-xl
                            transition-all duration-200 
                            min-w-[64px] max-w-[80px] min-h-[44px]
                            relative
                            group
                            overflow-visible
                            flex-1
                            ${activeView === item.view
                ? "text-brand-accent bg-brand-accent/10"
                : "text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-input/50 active:bg-brand-input"
              }
                        `}
            aria-label={item.label}
          >
            {/* Icon */}
            <div className="relative mb-1">
              <item.icon
                className={`
                                w-5 h-5
                                transition-all duration-200
                                ${activeView === item.view ? "transform scale-110" : "group-active:scale-95"}
                            `}
              />
              {/* Active indicator dot */}
              {activeView === item.view && (
                <div
                  className="
                                    absolute -top-1 -right-1
                                    w-1.5 h-1.5
                                    rounded-full
                                    bg-brand-accent
                                    animate-pulse-soft
                                "
                />
              )}
            </div>

            {/* Label */}
            <span
              className={`
                            text-[9px] font-semibold
                            leading-tight
                            text-center
                            w-full
                            truncate
                            transition-all duration-200
                            ${activeView === item.view ? "font-bold" : ""}
                        `}
            >
              {item.label}
            </span>

            {/* Background highlight */}
            <div
              className={`
                            absolute inset-0
                            rounded-xl
                            transition-all duration-300
                            pointer-events-none
                            ${activeView === item.view
                  ? "bg-gradient-to-t from-brand-accent/10 to-transparent"
                  : "bg-transparent group-hover:bg-brand-input/30"
                }
                        `}
            />
          </button>
        ))}
      </div>
    </nav>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(() => {
    try {
      const storedValue = window.localStorage.getItem("vena-isAuthenticated");
      return storedValue ? JSON.parse(storedValue) : false;
    } catch {
      return false;
    }
  });

  const [currentUser, setCurrentUser] = React.useState<User | null>(() => {
    try {
      const storedValue = window.localStorage.getItem("vena-currentUser");
      return storedValue ? JSON.parse(storedValue) : null;
    } catch {
      return null;
    }
  });

  React.useEffect(() => {
    window.localStorage.setItem("vena-isAuthenticated", JSON.stringify(isAuthenticated));
  }, [isAuthenticated]);

  React.useEffect(() => {
    window.localStorage.setItem("vena-currentUser", JSON.stringify(currentUser));
  }, [currentUser]);

  const [activeView, setActiveView] = React.useState<ViewType>(ViewType.HOMEPAGE);
  const [notification, setNotification] = React.useState<string>("");
  const [initialAction, setInitialAction] = React.useState<NavigationAction | null>(
    null,
  );
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [route, setRoute] = React.useState(window.location.hash || "#/home");
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const didRestoreLastRouteRef = React.useRef(false);

  // Force light mode globally on app load
  React.useEffect(() => {
    document.documentElement.classList.remove("dark");
    try {
      window.localStorage.setItem("theme", "light");
    } catch (error) {
      console.warn("[Theme] Failed to set theme in localStorage:", error);
    }
  }, []);

  // Handle URL without hash redirect for gallery
  React.useEffect(() => {
    const currentPath = window.location.pathname;
    const currentHash = window.location.hash;

    // If no hash and path starts with /gallery/, redirect to hash-based URL
    if (!currentHash && currentPath.startsWith("/gallery/")) {
      const galleryId = currentPath.split("/gallery/")[1];
      if (galleryId) {
        window.location.href = `${window.location.origin}/#/gallery/${galleryId}`;
        return;
      }
    }
  }, []);

  // --- State Initialization with Persistence ---
  const [users, setUsers] = React.useState<User[]>([]);

  const [clients, setClients] = React.useState<Client[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [teamProjectPayments, setTeamProjectPayments] = React.useState<
    TeamProjectPayment[]
  >([]);
  const [teamPaymentsLoaded, setTeamPaymentsLoaded] = React.useState(false);
  const [teamPaymentRecords, setTeamPaymentRecords] = React.useState<
    TeamPaymentRecord[]
  >([]);
  const [pockets, setPockets] = React.useState<FinancialPocket[]>([]);
  // Inisialisasi profile tanpa MOCK; isi dari Supabase pada efek load profile
  const [profile, setProfile] = React.useState<Profile>({
    projectTypes: [],
    projectStatusConfig: [],
    eventTypes: [],
  } as unknown as Profile);
  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [cards, setCards] = React.useState<Card[]>([]);
  const [clientFeedback, setClientFeedback] = React.useState<ClientFeedback[]>([]);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [promoCodes, setPromoCodes] = React.useState<PromoCode[]>([]);
  const [packages, setPackages] = React.useState<Package[]>([]);
  const [addOns, setAddOns] = React.useState<AddOn[]>([]);
  const [contracts, setContracts] = React.useState<Contract[]>([]);

  // --- Lazy Data Loading Hook ---
  const appData = useAppData();

  // --- [NEW] CENTRALIZED NOTIFICATION HANDLER ---
  const addNotification = async (
    newNotificationData: Omit<Notification, "id" | "timestamp" | "isRead">,
  ) => {
    const payload: Omit<Notification, "id"> = {
      ...newNotificationData,
      timestamp: new Date().toISOString(),
      isRead: false,
    } as any;
    try {
      const created = await createNotificationRow(payload);
      setNotifications((prev) => [created, ...prev]);
    } catch (e) {
      console.warn(
        "[Notifications] Failed to create notification in Supabase:",
        e,
      );
      // Fallback to local append if needed
      const fallback: Notification = {
        id: crypto.randomUUID(),
        ...payload,
      } as Notification;
      setNotifications((prev) => [fallback, ...prev]);
    }
  };

  // --- [NEW] One-time migration: clients from localStorage to Supabase ---
  React.useEffect(() => {
    const KEY = "vena-clients";
    const FLAG = "vena-clients-migrated";
    if ((window as any)[FLAG] || window.localStorage.getItem(FLAG) === "yes")
      return;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return;
      const parsedData = JSON.parse(raw);
      if (!Array.isArray(parsedData) || parsedData.length === 0) return;
      (async () => {
        try {
          // Lazy import to avoid circular deps
          const mod = await import("./services/clients");
          for (const c of parsedData) {
            try {
              await mod.createClient({
                id: c.id, // preserve original id if service allows
                name: c.name,
                email: c.email,
                phone: c.phone,
                whatsapp: c.whatsapp ?? undefined,
                since: c.since,
                instagram: c.instagram ?? undefined,
                status: c.status,
                clientType: c.clientType,
                lastContact: c.lastContact,
                portalAccessId: c.portalAccessId,
              } as any);
            } catch (e) {
              // Ignore per-row errors (e.g., duplicates)
              console.warn("[Migration] Failed to migrate client:", c.id, e);
            }
          }
          window.localStorage.setItem(FLAG, "yes");
          console.info("[Migration] clients migrated to Supabase.");
        } catch (err) {
          console.warn("[Migration] clients migration failed.", err);
        }
      })();
    } catch (error) {
      console.warn("[Migration] Failed to parse localStorage data:", error);
    }
  }, []);

  // --- [DISABLED FOR PERFORMANCE] Realtime: promo_codes ---
  // Promo codes rarely change, load once on demand instead
  // useEffect(() => {
  //     const channel = supabase.channel('realtime-promo-codes')
  //         .on('postgres_changes', { event: '*', schema: 'public', table: 'promo_codes' }, (payload) => {
  //             console.log('Promo code change received!', payload);
  //             if (payload.eventType === 'INSERT') {
  //                 setPromoCodes(current => [payload.new as PromoCode, ...current]);
  //             }
  //             if (payload.eventType === 'UPDATE') {
  //                 setPromoCodes(current => current.map(pc => pc.id === payload.new.id ? { ...(pc as any), ...(payload.new as any) } : pc));
  // --- Sync clients from lazy loading hook with REALTIME ---
  React.useEffect(() => {
    if (appData.loaded.clients) {
      setClients(appData.clients);
    }

    const channel = supabase
      .channel("realtime-clients")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        (payload) => {
          console.log("Client change received!", payload);
          if (payload.eventType === "INSERT") {
            setClients((current) => {
              if (current.some(item => item.id === payload.new.id)) return current;
              return [payload.new as Client, ...current];
            });
          }
          if (payload.eventType === "UPDATE") {
            setClients((currentClients) =>
              currentClients.map((c) =>
                c.id === payload.new.id
                  ? ({ ...c, ...payload.new } as Client)
                  : c,
              ),
            );
          }
          if (payload.eventType === "DELETE") {
            setClients((currentClients) =>
              currentClients.filter((c) => c.id !== (payload.old as any).id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appData.clients, appData.loaded.clients]);

  // --- Sync team members from lazy loading hook with REALTIME ---
  React.useEffect(() => {
    if (appData.loaded.teamMembers) {
      setTeamMembers(appData.teamMembers);
    }

    const channel = supabase
      .channel("realtime-team-members")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_members" },
        (payload) => {
          console.log("Team member change received!", payload);
          if (payload.eventType === "INSERT") {
            setTeamMembers((current) => {
              if (current.some(item => item.id === payload.new.id)) return current;
              return [payload.new as TeamMember, ...current];
            });
          }
          if (payload.eventType === "UPDATE") {
            setTeamMembers((current) =>
              current.map((m) =>
                m.id === payload.new.id
                  ? ({ ...m, ...payload.new } as TeamMember)
                  : m,
              ),
            );
          }
          if (payload.eventType === "DELETE") {
            setTeamMembers((current) =>
              current.filter((m) => m.id !== (payload.old as any).id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appData.teamMembers, appData.loaded.teamMembers]);

  // --- Sync promo codes from lazy loading hook ---
  React.useEffect(() => {
    if (appData.loaded.promoCodes) {
      setPromoCodes(appData.promoCodes);
    }
  }, [appData.promoCodes, appData.loaded.promoCodes]);

  // --- Sync leads from lazy loading hook ---
  React.useEffect(() => {
    if (appData.loaded.leads) {
      setLeads(appData.leads);
    }
  }, [appData.leads, appData.loaded.leads]);

  // --- Sync client feedback from lazy loading hook ---
  React.useEffect(() => {
    if (appData.loaded.clientFeedback) {
      setClientFeedback(appData.clientFeedback);
    }
  }, [appData.clientFeedback, appData.loaded.clientFeedback]);

  // --- Sync transactions from lazy loading hook with REALTIME ---
  React.useEffect(() => {
    if (appData.loaded.transactions) {
      setTransactions(appData.transactions);
    }

    const channel = supabase
      .channel("realtime-transactions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        (payload) => {
          console.log("Transaction change received!", payload);
          if (payload.eventType === "INSERT") {
            setTransactions((current) => {
              if (current.some(item => item.id === payload.new.id)) return current;
              return [payload.new as Transaction, ...current];
            });
          }
          if (payload.eventType === "UPDATE") {
            setTransactions((current) =>
              current.map((t) =>
                t.id === payload.new.id
                  ? ({ ...t, ...payload.new } as Transaction)
                  : t,
              ),
            );
          }
          if (payload.eventType === "DELETE") {
            setTransactions((current) =>
              current.filter((t) => t.id !== (payload.old as any).id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appData.transactions, appData.loaded.transactions]);

  // --- Sync projects from lazy loading hook (which already uses relations) with REALTIME ---
  React.useEffect(() => {
    if (appData.loaded.projects) {
      // Prefer projects from appData (loaded via listProjectsWithRelations)
      setProjects(appData.projects as any);
    }
    // Keep existing realtime subscription below to capture future changes on 'projects'
  }, [appData.projects, appData.loaded.projects]);

  React.useEffect(() => {
    if (appData.loaded.promoCodes) {
      setPromoCodes(appData.promoCodes);
    }
  }, [appData.promoCodes, appData.loaded.promoCodes]);

  React.useEffect(() => {
    if (appData.loaded.leads) {
      setLeads(appData.leads);
    }
  }, [appData.leads, appData.loaded.leads]);

  React.useEffect(() => {
    if (appData.loaded.clientFeedback) {
      setClientFeedback(appData.clientFeedback);
    }
  }, [appData.clientFeedback, appData.loaded.clientFeedback]);

  React.useEffect(() => {
    if (appData.loaded.teamMembers) {
      setTeamMembers(appData.teamMembers);
    }
  }, [appData.teamMembers, appData.loaded.teamMembers]);

  React.useEffect(() => {
    if (appData.loaded.transactions) {
      setTransactions(appData.transactions);
    }
  }, [appData.transactions, appData.loaded.transactions]);

  // Helper: map DB row (snake_case) to Card interface (camelCase)
  const mapCardRowToCard = (row: any): Card => ({
    id: row.id,
    cardHolderName: row.card_holder_name,
    bankName: row.bank_name,
    cardType: row.card_type as CardType,
    lastFourDigits: row.last_four_digits ?? "",
    expiryDate: row.expiry_date ?? undefined,
    balance: Number(row.balance || 0),
    colorGradient: row.color_gradient || "from-slate-200 to-slate-400",
  });

  // --- [NEW] Realtime: cards ---
  React.useEffect(() => {
    try {
      window.localStorage.removeItem("vena-cards");
    } catch {}
    let isMounted = true;

    // 1. Initial fetch
    (async () => {
      try {
        const remoteRows = await listCardsFromDb();
        if (!isMounted) return;
        const mapped = Array.isArray(remoteRows)
          ? remoteRows.map(mapCardRowToCard)
          : [];
        setCards(mapped);
      } catch (e) {
        console.warn("[Supabase] Failed to fetch cards.", e);
      }
    })();

    // 2. Realtime subscription
    const channel = supabase
      .channel("realtime-cards")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cards" },
        (payload) => {
          console.log("Card change received!", payload);
          if (payload.eventType === "INSERT") {
            const next = mapCardRowToCard(payload.new);
            setCards((current) => {
              const exists = current.some((c) => c.id === next.id);
              return exists
                ? current.map((c) => (c.id === next.id ? next : c))
                : [next, ...current];
            });
          }
          if (payload.eventType === "UPDATE") {
            const next = mapCardRowToCard(payload.new);
            setCards((current) => {
              const exists = current.some((c) => c.id === next.id);
              return exists
                ? current.map((c) => (c.id === next.id ? next : c))
                : [next, ...current];
            });
          }
          if (payload.eventType === "DELETE") {
            setCards((current) =>
              current.filter((c) => c.id !== (payload.old as any).id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // --- [NEW] Realtime: pockets ---
  React.useEffect(() => {
    const channel = supabase
      .channel("realtime-pockets")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pockets" },
        (payload) => {
          console.log("Pocket change received!", payload);
          if (payload.eventType === "INSERT") {
            setPockets((current) => [
              payload.new as unknown as FinancialPocket,
              ...current,
            ]);
          }
          if (payload.eventType === "UPDATE") {
            setPockets((current) =>
              current.map((p) =>
                p.id === (payload.new as any).id
                  ? ({ ...p, ...payload.new } as any)
                  : p,
              ),
            );
          }
          if (payload.eventType === "DELETE") {
            setPockets((current) =>
              current.filter((p) => p.id !== (payload.old as any).id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- [NEW] One-time migration: teamPaymentRecords from localStorage to Supabase ---
  React.useEffect(() => {
    const KEY = "vena-teamPaymentRecords";
    const FLAG = "vena-teamPaymentRecords-migrated";
    if ((window as any)[FLAG] || window.localStorage.getItem(FLAG) === "yes")
      return;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return;
      const parsedData = JSON.parse(raw);
      if (!Array.isArray(parsedData) || parsedData.length === 0) return;
      (async () => {
        try {
          for (const rec of parsedData) {
            try {
              await createTeamPaymentRecord({
                recordNumber: rec.recordNumber,
                teamMemberId: rec.teamMemberId,
                date: rec.date,
                projectPaymentIds: rec.projectPaymentIds || [],
                totalAmount: rec.totalAmount || 0,
                vendorSignature: rec.vendorSignature || null,
              } as any);
            } catch {}
          }
          window.localStorage.setItem(FLAG, "yes");
          window.localStorage.removeItem(KEY);
          console.info("[Migration] teamPaymentRecords migrated to Supabase.");
        } catch (err) {
          console.warn("[Migration] teamPaymentRecords migration failed.", err);
        }
      })();
    } catch {}
  }, []);

  // --- [NEW] Load team payment records from Supabase on init and clear legacy localStorage ---
  React.useEffect(() => {
    try {
      window.localStorage.removeItem("vena-teamPaymentRecords");
    } catch {}
    let isMounted = true;
    (async () => {
      try {
        const remote = await listTeamPaymentRecordsFromDb();
        if (!isMounted) return;
        setTeamPaymentRecords(Array.isArray(remote) ? remote : []);
      } catch (e) {
        console.warn("[Supabase] Failed to fetch team payment records.", e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // --- [NEW] Load pockets from Supabase on init and clear legacy localStorage ---
  React.useEffect(() => {
    try {
      window.localStorage.removeItem("vena-pockets");
    } catch {}
    let isMounted = true;
    (async () => {
      try {
        const remote = await listPocketsFromDb();
        if (!isMounted) return;
        setPockets(Array.isArray(remote) ? (remote as any) : []);
      } catch (e) {
        console.warn("[Supabase] Failed to fetch pockets.", e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // --- [NEW] Load packages from Supabase on init and clear legacy localStorage ---
  React.useEffect(() => {
    try {
      window.localStorage.removeItem("vena-packages");
    } catch {}
    let isMounted = true;
    (async () => {
      try {
        const remote = await listPackages();
        if (!isMounted) return;
        if (Array.isArray(remote) && remote.length) setPackages(remote as any);
      } catch (e) {
        console.warn("[Supabase] Failed to fetch packages.", e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // --- [NEW] Load add-ons from Supabase on init and clear legacy localStorage ---
  React.useEffect(() => {
    try {
      window.localStorage.removeItem("vena-addOns");
    } catch {}
    let isMounted = true;
    (async () => {
      try {
        const remote = await listAddOns();
        if (!isMounted) return;
        if (Array.isArray(remote) && remote.length) setAddOns(remote as any);
      } catch (e) {
        console.warn("[Supabase] Failed to fetch add-ons.", e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // --- [NEW] Load users from Supabase on init ---
  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*');
        if (!isMounted) return;
        if (error) {
          console.warn('[Supabase] Failed to fetch users:', error);
          return;
        }
        if (data && Array.isArray(data)) {
          // Map database columns to User interface
          const mappedUsers: User[] = data.map((row: any) => ({
            id: row.id,
            email: row.email,
            password: row.password,
            fullName: row.full_name,
            companyName: row.company_name,
            role: row.role,
            permissions: row.permissions || [],
            restrictedCards: row.restricted_cards || [],
          }));
          setUsers(mappedUsers);
          console.log('[Supabase] Loaded users:', mappedUsers.length);
        }
      } catch (e) {
        console.warn('[Supabase] Failed to fetch users.', e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // --- [NEW] Load leads from Supabase on init with realtime ---
  React.useEffect(() => {
    try {
      window.localStorage.removeItem("vena-leads");
    } catch {}
    let isMounted = true;

    // 1. Initial fetch
    (async () => {
      try {
        const remoteLeads = await listLeadsFromDb();
        if (!isMounted) return;
        setLeads(Array.isArray(remoteLeads) ? remoteLeads : []);
      } catch (e) {
        console.warn("[Supabase] Failed to fetch leads.", e);
      }
    })();

    // 2. Realtime subscription
    const channel = supabase
      .channel("realtime-leads")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          console.log("Lead change received!", payload);
          if (payload.eventType === "INSERT") {
            setLeads((current) => [payload.new as Lead, ...current]);
          }
          if (payload.eventType === "UPDATE") {
            setLeads((current) =>
              current.map((l) =>
                l.id === payload.new.id
                  ? ({ ...l, ...payload.new } as Lead)
                  : l,
              ),
            );
          }
          if (payload.eventType === "DELETE") {
            setLeads((current) =>
              current.filter((l) => l.id !== (payload.old as any).id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // --- [NEW] Load profile from Supabase on init and clear legacy localStorage ---
  React.useEffect(() => {
    try {
      window.localStorage.removeItem("vena-profile");
    } catch {}
    let isMounted = true;
    (async () => {
      try {
        const remote = await getProfileFromDb();
        if (!isMounted) return;
        if (remote) setProfile(remote);
      } catch (e) {
        console.warn("[Supabase] Failed to fetch profile, using defaults.", e);
      }
    })();

    const channel = supabase
      .channel("realtime-profiles")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          console.log("Profile update received!", payload);
          if (isMounted) {
            setProfile(payload.new as Profile);
          }
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // --- [NEW] Ensure teamProjectPayments sourced only from Supabase ---
  React.useEffect(() => {
    try {
      window.localStorage.removeItem("vena-teamProjectPayments");
    } catch {}
    let isMounted = true;
    (async () => {
      try {
        const remote = await listAllTeamPayments();
        if (!isMounted) return;
        setTeamProjectPayments(Array.isArray(remote) ? remote : []);
      } catch (e) {
        console.warn("[Supabase] Failed to fetch team project payments.", e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // --- [NEW] Ensure projects are sourced only from Supabase (clear legacy localStorage key) ---
  React.useEffect(() => {
    try {
      window.localStorage.removeItem("vena-projects");
    } catch {}
  }, []);

  // --- [MODIFIED] Load projects from Supabase on init with REALTIME ---
  React.useEffect(() => {
    let isMounted = true;

    // 1. Initial fetch (with relations so team assignments are available)
    const fetchProjects = async () => {
      try {
        const remoteProjects = await listProjectsWithRelations({ limit: 100 });
        if (isMounted) {
          setProjects(
            Array.isArray(remoteProjects) ? (remoteProjects as any) : [],
          );
        }
      } catch (e) {
        console.warn("[Supabase] Failed to fetch initial projects.", e);
      }
    };

    fetchProjects();

    // 2. Realtime subscription
    const channel = supabase
      .channel("realtime-projects-init")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        (payload) => {
          console.log("Project change received!", payload);
          if (payload.eventType === "INSERT") {
            setProjects((current) => {
              if (current.some(item => item.id === payload.new.id)) return current;
              return [payload.new as Project, ...current];
            });
          }
          if (payload.eventType === "UPDATE") {
            setProjects((currentProjects) =>
              currentProjects.map((p) =>
                p.id === payload.new.id
                  ? ({ ...p, ...payload.new } as Project)
                  : p,
              ),
            );
          }
          if (payload.eventType === "DELETE") {
            setProjects((currentProjects) =>
              currentProjects.filter((p) => p.id !== (payload.old as any).id),
            );
          }
        },
      )
      .subscribe();

    // 3. Cleanup
    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // --- [NEW] Load contracts from Supabase on init with REALTIME ---
  React.useEffect(() => {
    let isMounted = true;

    // 1. Initial fetch
    const fetchContracts = async () => {
      try {
        const remoteContracts = await listContracts();
        if (isMounted) {
          setContracts(Array.isArray(remoteContracts) ? remoteContracts : []);
        }
      } catch (e) {
        console.warn("[Supabase] Failed to fetch initial contracts.", e);
      }
    };

    fetchContracts();

    // 2. Realtime subscription
    const channel = supabase
      .channel("realtime-contracts-init")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contracts" },
        (payload) => {
          console.log("Contract change received!", payload);
          if (payload.eventType === "INSERT") {
            setContracts((current) => {
              if (current.some(item => item.id === payload.new.id)) return current;
              return [payload.new as Contract, ...current];
            });
          }
          if (payload.eventType === "UPDATE") {
            setContracts((current) =>
              current.map((c) =>
                c.id === payload.new.id
                  ? ({ ...c, ...payload.new } as Contract)
                  : c,
              ),
            );
          }
          if (payload.eventType === "DELETE") {
            setContracts((current) =>
              current.filter((c) => c.id !== (payload.old as any).id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const newRoute = window.location.hash || "#/home";
      setRoute(newRoute);
      if (!isAuthenticated) {
        const isPublicRoute =
          newRoute.startsWith("#/public") ||
          newRoute.startsWith("#/gallery") ||
          newRoute.startsWith("#/feedback") ||
          newRoute.startsWith("#/suggestion-form") ||
          newRoute.startsWith("#/checklist-portal") ||
          newRoute.startsWith("#/portal") ||
          newRoute.startsWith("#/freelancer-portal") ||
          newRoute.startsWith("#/login") ||
          newRoute === "#/home" ||
          newRoute === "#";
        if (!isPublicRoute) {
          // Preserve intended internal route so we can return after login
          try {
            window.localStorage.setItem(LAST_ROUTE_STORAGE_KEY, newRoute);
          } catch (e) {
            console.warn(
              "[Routing] Failed to persist intended route before login:",
              e,
            );
          }
          window.location.hash = "#/login";
        }
      } else {
        const isPublicRoute =
          newRoute.startsWith("#/public") ||
          newRoute.startsWith("#/gallery") ||
          newRoute.startsWith("#/feedback") ||
          newRoute.startsWith("#/suggestion-form") ||
          newRoute.startsWith("#/portal") ||
          newRoute.startsWith("#/freelancer-portal");

        if (!didRestoreLastRouteRef.current) {
          didRestoreLastRouteRef.current = true;
          const isEmptyOrHome =
            newRoute === "#" ||
            newRoute === "" ||
            newRoute.startsWith("#/home");
          if (!isPublicRoute && isEmptyOrHome) {
            try {
              const last = window.localStorage.getItem(LAST_ROUTE_STORAGE_KEY);
              if (
                last &&
                typeof last === "string" &&
                last.startsWith("#/") &&
                !last.startsWith("#/home")
              ) {
                window.location.hash = last;
                return;
              }
            } catch (e) {
              console.warn(
                "[Routing] Failed to restore last route from localStorage:",
                e,
              );
            }
          }
        }

        // Allow authenticated users to stay on Home if they are there on initial load.
        // Only redirect away from explicit auth landing pages like login or empty hash.
        const shouldRedirectFrom =
          newRoute.startsWith("#/login") || newRoute === "#";
        if (shouldRedirectFrom) {
          window.location.hash = "#/dashboard";
        }

        // Persist last internal app route for next reload (avoid persisting public routes)
        if (
          !isPublicRoute &&
          newRoute.startsWith("#/") &&
          !newRoute.startsWith("#/login") &&
          !newRoute.startsWith("#/home") &&
          newRoute !== "#"
        ) {
          try {
            window.localStorage.setItem(LAST_ROUTE_STORAGE_KEY, newRoute);
          } catch (e) {
            console.warn(
              "[Routing] Failed to persist last route to localStorage:",
              e,
            );
          }
        }
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    handleHashChange(); // Initial check
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [isAuthenticated]);

  useEffect(() => {
    const path = (route.split("?")[0].split("/")[1] || "home").toLowerCase();

    const routeToView: Record<string, ViewType> = {
      home: ViewType.HOMEPAGE,
      dashboard: ViewType.DASHBOARD,
      "Calon Pengantin": ViewType["Calon Pengantin"],
      prospek: ViewType["Calon Pengantin"],
      "calon pengantin": ViewType["Calon Pengantin"],
      booking: ViewType.BOOKING,
      clients: ViewType.CLIENTS,
      projects: ViewType.PROJECTS,
      team: ViewType.TEAM,
      finance: ViewType.FINANCE,
      calendar: ViewType.CALENDAR,
      packages: ViewType.PACKAGES,
      "promo-codes": ViewType.PROMO_CODES,
      gallery: ViewType.GALLERY,
      "client-reports": ViewType.CLIENT_REPORTS,
      settings: ViewType.SETTINGS,
    };

    if (Object.prototype.hasOwnProperty.call(routeToView, path)) {
      setActiveView(routeToView[path]);
      return;
    }

    const newView = Object.values(ViewType).find(
      (v) => v.toLowerCase().replace(/ /g, "-") === path,
    );
    if (newView) {
      setActiveView(newView);
    } else if (path === "team") {
      // Handle 'Tim / Vendor' mapping to 'team' route
      setActiveView(ViewType.TEAM);
    }
  }, [route]);

  // Ensure data loads when activeView changes (covers direct URL/hash navigation)
  useEffect(() => {
    if (!isAuthenticated) return;
    switch (activeView) {
      case ViewType.DASHBOARD:
        appData.loadClients();
        appData.loadProjects();
        appData.loadTransactions();
        appData.loadTeamMembers();
        break;
      case ViewType["Calon Pengantin"]:
        appData.loadClients();
        appData.loadProjects();
        break;
      case ViewType.BOOKING:
        appData.loadClients();
        appData.loadProjects();
        break;
      case ViewType.CLIENTS:
        appData.loadClients();
        break;
      case ViewType.PROJECTS:
        appData.loadProjects();
        appData.loadTeamMembers();
        if (!teamPaymentsLoaded) {
          (async () => {
            try {
              const items = await listAllTeamPayments();
              setTeamProjectPayments(items);
              setTeamPaymentsLoaded(true);
            } catch (e) {
              console.warn(
                "[TeamPayments] Failed to fetch team project payments:",
                e,
              );
            }
          })();
        }
        break;
      case ViewType.TEAM:
        appData.loadTeamMembers();
        break;
      case ViewType.FINANCE:
        appData.loadTransactions();
        break;
      case ViewType.PACKAGES:
      case ViewType.PROMO_CODES:
        appData.loadPromoCodes();
        appData.loadProjects();
        break;
      case ViewType.CALENDAR:
      case ViewType.GALLERY:
        appData.loadProjects();
        break;

      default:
        break;
    }
  }, [
    activeView,
    isAuthenticated,
    appData.loadClients,
    appData.loadProjects,
    appData.loadTeamMembers,
    appData.loadTransactions,
  ]);

  // --- Pre-load ALL critical data when authenticated so every page shows data immediately ---
  useEffect(() => {
    if (!isAuthenticated) return;

    // Load all data in parallel immediately - no delay.
    appData.loadClients();
    appData.loadProjects();
    appData.loadTransactions();
    appData.loadTeamMembers();
    appData.loadLeads();
    appData.loadClientFeedback();
    appData.loadPromoCodes();
    appData.loadTotals();
  }, [
    isAuthenticated,
    appData.loadClients,
    appData.loadProjects,
    appData.loadTransactions,
    appData.loadTeamMembers,
    appData.loadLeads,
    appData.loadClientFeedback,
    appData.loadPromoCodes,
    appData.loadTotals,
  ]);

  useEffect(() => {
    const styleElement = document.getElementById("public-theme-style");
    const isPublicRoute =
      route.startsWith("#/public") ||
      route.startsWith("#/gallery") ||
      route.startsWith("#/portal") ||
      route.startsWith("#/freelancer-portal");

    document.body.classList.toggle("app-theme", !isPublicRoute);
    document.body.classList.toggle("public-page-body", isPublicRoute);

    if (isPublicRoute) {
      const brandColor = profile.brandColor || "#3b82f6";

      if (styleElement) {
        const hoverColor = darkenColor(brandColor, 10);
        const brandHsl = hexToHsl(brandColor);
        styleElement.innerHTML = `
                    :root {
                        --public-accent: ${brandColor};
                        --public-accent-hover: ${hoverColor};
                        --public-accent-hsl: ${brandHsl};
                    }
                `;
      }
    } else if (styleElement) {
      styleElement.innerHTML = "";
    }
  }, [route, profile.brandColor]);

  // Ensure required data is loaded when visiting public portal routes directly
  useEffect(() => {
    if (route.startsWith("#/portal/")) {
      appData.loadClients();
      appData.loadProjects();
      appData.loadTransactions();
    }

    if (route.startsWith("#/freelancer-portal/")) {
      appData.loadTeamMembers();
      appData.loadProjects();
      appData.loadTransactions();
    }
  }, [
    route,
    appData.loadClients,
    appData.loadProjects,
    appData.loadTransactions,
    appData.loadTeamMembers,
  ]);

  const showNotification = (message: string, duration: number = 3000) => {
    setNotification(message);
    setTimeout(() => {
      setNotification("");
    }, duration);
  };

  const handleSetProfile = (value: React.SetStateAction<Profile>) => {
    setProfile(value);
  };

  const handleLoginSuccess = (user: User) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    try {
      const last = window.localStorage.getItem(LAST_ROUTE_STORAGE_KEY);
      if (
        last &&
        typeof last === "string" &&
        last.startsWith("#/") &&
        !last.startsWith("#/home") &&
        !last.startsWith("#/login")
      ) {
        window.location.hash = last;
        return;
      }
    } catch (e) {
      console.warn("[Routing] Failed to read last route after login:", e);
    }

    window.location.hash = "#/dashboard";
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setIsSidebarOpen(false);
    setIsSearchOpen(false);
    try {
      window.localStorage.removeItem(LAST_ROUTE_STORAGE_KEY);
      window.localStorage.setItem("vena-isAuthenticated", "false");
    } catch { }
    window.location.hash = "#/home";
  };

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleNavigation = (
    view: ViewType,
    action?: NavigationAction,
    notificationId?: string,
  ) => {
    const pathMap: Partial<Record<ViewType, string>> = {
      [ViewType.HOMEPAGE]: "home",
      [ViewType.DASHBOARD]: "dashboard",
      [ViewType["Calon Pengantin"]]: "prospek",
      [ViewType.BOOKING]: "booking",
      [ViewType.CLIENTS]: "clients",
      [ViewType.PROJECTS]: "projects",
      [ViewType.TEAM]: "team",
      [ViewType.FINANCE]: "finance",
      [ViewType.CALENDAR]: "calendar",
      [ViewType.PACKAGES]: "packages",
      [ViewType.PROMO_CODES]: "promo-codes",
      [ViewType.CLIENT_REPORTS]: "client-reports",
      [ViewType.SETTINGS]: "settings",
      [ViewType.CONTRACTS]: "contracts",
    };

    const newRoute = `#/${pathMap[view] || view.toLowerCase().replace(/ /g, "-")}`;

    window.location.hash = newRoute;

    try {
      window.localStorage.setItem(LAST_ROUTE_STORAGE_KEY, newRoute);
    } catch (e) {
      console.warn(
        "[Routing] Failed to persist last route to localStorage:",
        e,
      );
    }

    // Lazy load data based on view
    switch (view) {
      case ViewType.CLIENTS:
        appData.loadClients();
        break;
      case ViewType.PROJECTS:
        appData.loadProjects();
        appData.loadTeamMembers();
        break;
      case ViewType.TEAM:
        appData.loadTeamMembers();
        break;
      case ViewType.FINANCE:
        appData.loadTransactions();
        break;
    }

    setActiveView(view);
    setInitialAction(action || null);
    setIsSidebarOpen(false); // Close sidebar on navigation
    setIsSearchOpen(false); // Close search on navigation

    if (notificationId) {
      handleMarkAsRead(notificationId);
    }
  };

  const hasPermission = (view: ViewType) => {
    if (!currentUser) return false;
    if (currentUser.role === "Admin") return true;
    return currentUser.permissions?.includes(view) || false;
  };

  const renderView = () => {
    if (!hasPermission(activeView)) {
      return (
        <AccessDenied
          onBackToDashboard={() => setActiveView(ViewType.DASHBOARD)}
        />
      );
    }
    switch (activeView) {
      case ViewType.DASHBOARD:
        return (
          <Dashboard
            projects={projects}
            clients={clients}
            transactions={transactions}
            teamMembers={teamMembers}
            cards={cards}
            pockets={pockets}
            handleNavigation={handleNavigation}
            leads={leads}
            teamProjectPayments={teamProjectPayments}
            packages={packages}
            clientFeedback={clientFeedback}
            currentUser={currentUser}
            projectStatusConfig={profile.projectStatusConfig}
            profile={profile}
            totals={appData.totals}
          />
        );
      case ViewType["Calon Pengantin"]:
        return (
          <Leads
            leads={leads}
            setLeads={setLeads}
            clients={clients}
            setClients={setClients}
            projects={projects}
            setProjects={setProjects}
            packages={packages}
            addOns={addOns}
            transactions={transactions}
            setTransactions={setTransactions}
            userProfile={profile}
            setProfile={handleSetProfile}
            showNotification={showNotification}
            cards={cards}
            setCards={setCards}
            pockets={pockets}
            setPockets={setPockets}
            promoCodes={promoCodes}
            setPromoCodes={setPromoCodes}
            handleNavigation={handleNavigation}
            totals={appData.totals}
          />
        );
      case ViewType.BOOKING:
        return (
          <Booking
            leads={leads}
            clients={clients}
            projects={projects}
            setProjects={setProjects}
            packages={packages}
            userProfile={profile}
            setProfile={setProfile}
            handleNavigation={handleNavigation}
            showNotification={showNotification}
          />
        );
      case ViewType.CLIENTS:
        return (
          <DataLoadingWrapper
            loading={appData.loading.clients}
            loaded={appData.loaded.clients}
            loadingMessage="Memuat data klien..."
            onRetry={appData.loadClients}
          >
            <Clients
              clients={clients}
              setClients={setClients}
              projects={projects}
              setProjects={setProjects}
              packages={packages}
              addOns={addOns}
              transactions={transactions}
              setTransactions={setTransactions}
              userProfile={profile}
              showNotification={showNotification}
              initialAction={initialAction}
              setInitialAction={setInitialAction}
              cards={cards}
              setCards={setCards}
              pockets={pockets}
              setPockets={setPockets}
              handleNavigation={handleNavigation}
              clientFeedback={clientFeedback}
              promoCodes={promoCodes}
              setPromoCodes={setPromoCodes}
              totals={appData.totals}
              onSignInvoice={async (pId, sig) => {
                // Optimistic UI
                setProjects((prev) =>
                  prev.map((p) =>
                    p.id === pId ? { ...p, invoiceSignature: sig } : p,
                  ),
                );
                try {
                  await updateProjectInDb(pId, {
                    invoiceSignature: sig,
                  } as any);
                } catch (e) {
                  console.warn("[App] Failed to persist invoice signature:", e);
                }
              }}
              onSignTransaction={async (tId, sig) => {
                // Optimistic UI
                setTransactions((prev) =>
                  prev.map((t) =>
                    t.id === tId ? { ...t, vendorSignature: sig } : t,
                  ),
                );
                try {
                  await updateTransactionInDb(tId, {
                    vendorSignature: sig,
                  } as any);
                } catch (e) {
                  console.warn(
                    "[App] Failed to persist transaction signature:",
                    e,
                  );
                }
              }}
              onRecordPayment={async (
                projectId: string,
                amount: number,
                destinationCardId: string,
              ) => {
                try {
                  const today = new Date().toISOString().split("T")[0];
                  const proj = projects.find((p) => p.id === projectId);
                  if (!proj) return;
                  // Create income transaction
                  const tx = await createTransaction({
                    date: today,
                    description: `Pembayaran Acara Pernikahan ${proj.projectName}`,
                    amount,
                    type: TransactionType.INCOME,
                    projectId,
                    category: "Pelunasan Acara Pernikahan",
                    method: "Transfer Bank",
                    cardId: destinationCardId,
                  } as any);
                  // Update card balance
                  if (destinationCardId) {
                    try {
                      await updateCardBalance(destinationCardId, amount);
                    } catch (error) {
                      console.error(
                        "[Payment] Failed to update card balance:",
                        error,
                      );
                    }
                    setCards((prev) =>
                      prev.map((c) =>
                        c.id === destinationCardId
                          ? { ...c, balance: (c.balance || 0) + amount }
                          : c,
                      ),
                    );
                  }
                  // Update project payment fields
                  const newAmountPaid = (proj.amountPaid || 0) + amount;
                  let newPaymentStatus = PaymentStatus.BELUM_BAYAR as any;
                  if (newAmountPaid >= proj.totalCost)
                    newPaymentStatus = PaymentStatus.LUNAS;
                  else if (newAmountPaid > 0)
                    newPaymentStatus = PaymentStatus.DP_TERBAYAR;
                  // Optimistic UI
                  setProjects((prev) =>
                    prev.map((p) =>
                      p.id === projectId
                        ? {
                          ...p,
                          amountPaid: newAmountPaid,
                          paymentStatus: newPaymentStatus,
                        }
                        : p,
                    ),
                  );
                  // Persist to Supabase
                  try {
                    await updateProjectInDb(projectId, {
                      amountPaid: newAmountPaid,
                      paymentStatus: newPaymentStatus,
                    } as any);
                  } catch (error) {
                    console.error(
                      "[Payment] Failed to update project in database:",
                      error,
                    );
                  }
                  // Update transactions list
                  setTransactions((prev) =>
                    [tx, ...prev].sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime(),
                    ),
                  );
                  showNotification("Pembayaran berhasil dicatat.");
                } catch (e) {
                  console.warn("[Clients] Failed to record payment:", e);
                  showNotification("Gagal mencatat pembayaran. Coba lagi.");
                }
              }}
              addNotification={addNotification}
            />
          </DataLoadingWrapper>
        );
      case ViewType.PROJECTS:
        return (
          <DataLoadingWrapper
            loading={appData.loading.projects}
            loaded={appData.loaded.projects}
            loadingMessage="Memuat data proyek..."
            onRetry={appData.loadProjects}
          >
            <Projects
              projects={projects}
              setProjects={setProjects}
              clients={clients}
              packages={packages}
              teamMembers={teamMembers}
              teamProjectPayments={teamProjectPayments}
              setTeamProjectPayments={setTeamProjectPayments}
              transactions={transactions}
              setTransactions={setTransactions}
              initialAction={initialAction}
              setInitialAction={setInitialAction}
              profile={profile}
              showNotification={showNotification}
              cards={cards}
              setCards={setCards}
              pockets={pockets}
              setPockets={setPockets}
              totals={appData.totals}
            />
          </DataLoadingWrapper>
        );
      case ViewType.TEAM:
        return (
          <DataLoadingWrapper
            loading={appData.loading.teamMembers}
            loaded={appData.loaded.teamMembers}
            loadingMessage="Memuat data tim..."
            onRetry={appData.loadTeamMembers}
          >
            <Freelancers
              teamMembers={teamMembers}
              setTeamMembers={setTeamMembers}
              teamProjectPayments={teamProjectPayments}
              setTeamProjectPayments={setTeamProjectPayments}
              teamPaymentRecords={teamPaymentRecords}
              setTeamPaymentRecords={setTeamPaymentRecords}
              transactions={transactions}
              setTransactions={setTransactions}
              userProfile={profile}
              showNotification={showNotification}
              initialAction={initialAction}
              setInitialAction={setInitialAction}
              projects={projects}
              setProjects={setProjects}

              pockets={pockets}
              setPockets={setPockets}
              cards={cards}
              setCards={setCards}
              onSignPaymentRecord={(rId, sig) =>
                setTeamPaymentRecords((prev) =>
                  prev.map((r) =>
                    r.id === rId ? { ...r, vendorSignature: sig } : r,
                  ),
                )
              }
              totals={appData.totals}
            />
          </DataLoadingWrapper>
        );
      case ViewType.FINANCE:
        return (
          <DataLoadingWrapper
            loading={appData.loading.transactions}
            loaded={appData.loaded.transactions}
            loadingMessage="Memuat data transaksi..."
            onRetry={appData.loadTransactions}
          >
            <Finance
              transactions={transactions}
              setTransactions={setTransactions}
              pockets={pockets}
              setPockets={setPockets}
              projects={projects}
              setProjects={setProjects}
              profile={profile}
              cards={cards}
              setCards={setCards}
              teamMembers={teamMembers}

            />
          </DataLoadingWrapper>
        );
      case ViewType.PACKAGES:
        return (
          <Packages
            packages={packages}
            setPackages={setPackages}
            addOns={addOns}
            setAddOns={setAddOns}
            projects={projects}
            profile={profile}
          />
        );
      case ViewType.SETTINGS:
        return (
          <Settings
            profile={profile}
            setProfile={handleSetProfile}
            transactions={transactions}
            projects={projects}
            packages={packages}
            users={users}
            setUsers={setUsers}
            currentUser={currentUser}
          />
        );
      case ViewType.CALENDAR:
        return (
          <CalendarView
            projects={projects}
            setProjects={setProjects}
            teamMembers={teamMembers}
            profile={profile}
            clients={clients}
            handleNavigation={handleNavigation}
          />
        );
      case ViewType.CLIENT_REPORTS:
        return (
          <ClientReports
            clients={clients}
            leads={leads}
            projects={projects}
            feedback={clientFeedback}
            setFeedback={setClientFeedback}
            showNotification={showNotification}
          />
        );

      case ViewType.PROMO_CODES:
        return (
          <DataLoadingWrapper
            loading={appData.loading.promoCodes}
            loaded={appData.loaded.promoCodes}
            loadingMessage="Memuat voucher..."
            onRetry={appData.loadPromoCodes}
          >
            <PromoCodes
              promoCodes={promoCodes}
              setPromoCodes={setPromoCodes}
              projects={projects}
              showNotification={showNotification}
            />
          </DataLoadingWrapper>
        );
      case ViewType.GALLERY:
        return (
          <GalleryUpload
            userProfile={profile}
            showNotification={showNotification}
          />
        );
      case ViewType.CONTRACTS:
        return (
          <Contracts
            contracts={contracts}
            setContracts={setContracts}
            projects={projects}
            clients={clients}
            profile={profile}
            showNotification={showNotification}
            initialAction={initialAction}
            setInitialAction={setInitialAction}
            packages={packages}
            onSignContract={async (contractId, signature, signer) => {
              // Optimistic UI
              setContracts((prev) =>
                prev.map((c) =>
                  c.id === contractId
                    ? {
                        ...c,
                        ...(signer === 'vendor'
                          ? { vendorSignature: signature }
                          : { clientSignature: signature }),
                      }
                    : c,
                ),
              );
              try {
                const { updateContract } = await import('./services/contracts');
                await updateContract(contractId,
                  signer === 'vendor'
                    ? { vendorSignature: signature }
                    : { clientSignature: signature },
                );
              } catch (e) {
                console.warn('[App] Failed to persist contract signature:', e);
              }
            }}
          />
        );
      default:
        return <div />;
    }
  };

  // --- ROUTING LOGIC ---
  if (route.startsWith("#/home") || route === "#/" || route === "#") {
    if (isAuthenticated) {
      try {
        const last = window.localStorage.getItem(LAST_ROUTE_STORAGE_KEY);
        if (
          last &&
          typeof last === "string" &&
          last.startsWith("#/") &&
          !last.startsWith("#/home") &&
          last !== route
        ) {
          window.location.hash = last;
          return null;
        }
      } catch (e) {
        console.warn(
          "[Routing] Failed to read last route from localStorage:",
          e,
        );
      }

      window.location.hash = "#/dashboard";
      return null;
    }

    return (
        <Suspense fallback={<LoadingFallback />}>
            <Homepage />
        </Suspense>
    );
  }
  if (route.startsWith("#/login"))
    return (
        <Suspense fallback={<LoadingFallback />}>
            <Login onLoginSuccess={handleLoginSuccess} users={users} />
        </Suspense>
    );

  if (route.startsWith("#/public-packages")) {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <PublicPackages
                userProfile={profile}
                showNotification={showNotification}
                setClients={setClients}
                setProjects={setProjects}
                setTransactions={setTransactions}
                setCards={setCards}
                setLeads={setLeads}
                addNotification={addNotification}
                cards={cards}
                projects={projects}
                promoCodes={promoCodes}
                setPromoCodes={setPromoCodes}
            />
        </Suspense>
    );
  }

  if (route.startsWith("#/checklist-portal/")) {
    const projectId = (route.split("#/checklist-portal/")[1] || "").split(/[?#]/)[0].split("/")[0];
    return (
        <Suspense fallback={<LoadingFallback />}>
            <ChecklistPortal projectId={projectId} />
        </Suspense>
    );
  }
  if (route.startsWith("#/public-booking")) {
    const allDataForForm = {
      clients,
      projects,
      teamMembers,
      transactions,
      teamProjectPayments,
      teamPaymentRecords,
      pockets,
      profile,
      leads,

      cards,
      clientFeedback,
      notifications,
      promoCodes,
      packages,
      addOns,
    };
    return (
        <Suspense fallback={<LoadingFallback />}>
            <PublicBookingForm
                {...allDataForForm}
                userProfile={profile}
                showNotification={showNotification}
                setClients={setClients}
                setProjects={setProjects}
                setTransactions={setTransactions}
                setCards={setCards}
                setPockets={setPockets}
                setPromoCodes={setPromoCodes}
                setLeads={setLeads}
                addNotification={addNotification}
            />
        </Suspense>
    );
  }
  if (route.startsWith("#/public-lead-form")) {
    // FIX: Pass addNotification prop to PublicLeadForm
    return (
        <Suspense fallback={<LoadingFallback />}>
            <PublicLeadForm
                setLeads={setLeads}
                userProfile={profile}
                showNotification={showNotification}
                addNotification={addNotification}
            />
        </Suspense>
    );
  }

  if (route.startsWith("#/feedback"))
    return (
        <Suspense fallback={<LoadingFallback />}>
            <PublicFeedbackForm setClientFeedback={setClientFeedback} />
        </Suspense>
    );
  if (route.startsWith("#/suggestion-form"))
    return (
        <Suspense fallback={<LoadingFallback />}>
            <SuggestionForm setLeads={setLeads} />
        </Suspense>
    );
  if (route.startsWith("#/test-signature"))
    return (
        <Suspense fallback={<LoadingFallback />}>
            <TestSignature />
        </Suspense>
    );
  if (route.startsWith("#/gallery/")) {
    const galleryId = route.split("/")[2];
    return (
        <Suspense fallback={<LoadingFallback />}>
            <PublicGallery galleryId={galleryId} />
        </Suspense>
    );
  }
  if (route.startsWith("#/portal/invoice/")) {
    const projectId = route.split("/portal/invoice/")[1] || "";
    return (
      <Suspense fallback={<LoadingFallback />}>
        <PublicInvoice
          projectId={projectId}
        />
      </Suspense>
    );
  }
  if (route.startsWith("#/portal/receipt/")) {
    const transactionId = route.split("/portal/receipt/")[1] || "";
    return (
      <Suspense fallback={<LoadingFallback />}>
        <PublicReceipt
          transactionId={transactionId}
        />
      </Suspense>
    );
  }
  if (route.startsWith("#/portal/contract/")) {
    const contractId = route.split("/portal/contract/")[1] || "";
    return (
      <Suspense fallback={<LoadingFallback />}>
        <PublicContract
          contractId={contractId}
        />
      </Suspense>
    );
  }
  if (route.startsWith("#/portal/")) {
    // Normalize accessId: cut off after next '/' or any query/hash, and decode
    const raw = route.split("/portal/")[1] || "";
    const accessId = decodeURIComponent(
      (raw.split(/[?#]/)[0] || "").split("/")[0] || "",
    ).trim();
    return (
        <Suspense fallback={<LoadingFallback />}>
            <ClientPortal
                accessId={accessId}
                clients={clients}
                projects={projects}
                setClientFeedback={setClientFeedback}
                showNotification={showNotification}
                transactions={transactions}
                userProfile={profile}
                packages={packages}
                teamMembers={teamMembers}
                onClientSubStatusConfirmation={async (pId, sub, note) => {
                    // Optimistic update
                    setProjects((prev) =>
                        prev.map((p) =>
                            p.id === pId
                                ? {
                                    ...p,
                                    confirmedSubStatuses: [
                                        ...(p.confirmedSubStatuses || []),
                                        sub,
                                    ],
                                    clientSubStatusNotes: {
                                        ...(p.clientSubStatusNotes || {}),
                                        [sub]: note,
                                    },
                                }
                                : p,
                        ),
                    );
                    // Persist to DB
                    try {
                        await markSubStatusConfirmed(pId, sub, note);
                    } catch (e) {
                        console.warn(
                            "[Portal] Failed to persist sub-status confirmation:",
                            e,
                        );
                    }
                }}
            />
        </Suspense>
    );
  }
  if (route.startsWith("#/freelancer-portal/")) {
    // Normalize accessId: cut off after next '/' or any query/hash, and decode
    const raw = route.split("/freelancer-portal/")[1] || "";
    const accessId = decodeURIComponent(
      (raw.split(/[?#]/)[0] || "").split("/")[0] || "",
    ).trim();
    return (
        <Suspense fallback={<LoadingFallback />}>
            <FreelancerPortal
                accessId={accessId}
                teamMembers={teamMembers}
                projects={projects}
                teamProjectPayments={teamProjectPayments}
                teamPaymentRecords={teamPaymentRecords}

                showNotification={showNotification}
                userProfile={profile}
                addNotification={addNotification}
            />
        </Suspense>
    );
  }

if (!isAuthenticated)
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Login onLoginSuccess={handleLoginSuccess} users={users} />
    </Suspense>
  );

return (
  <div className="flex min-h-screen bg-brand-bg text-brand-text-primary">
    {/* Main Layout */}
    <Sidebar
      activeView={activeView}
      setActiveView={(view) => handleNavigation(view)}
      isOpen={isSidebarOpen}
      setIsOpen={setIsSidebarOpen}
      currentUser={currentUser}
      profile={profile}
      onLogout={handleLogout}
    />

    <div className="flex-1 flex flex-col xl:pl-64 overflow-hidden">
      <Header
        pageTitle={activeView}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        setIsSearchOpen={setIsSearchOpen}
        notifications={notifications}
        handleNavigation={handleNavigation}
        handleMarkAllAsRead={handleMarkAllAsRead}
        currentUser={currentUser}
        profile={profile}
        handleLogout={handleLogout}
      />

      <main
        className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 pb-20 xl:pb-8 overflow-y-auto"
        style={{
          paddingBottom: "calc(5rem + var(--safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="animate-fade-in">
          <ErrorBoundary
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="text-red-500 text-4xl mb-2">âš ï¸</div>
                  <p className="text-brand-text-secondary">
                    Gagal memuat komponen. Silakan coba lagi.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-2 button-primary"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            }
          >
            <Suspense fallback={<LoadingFallback />}>
              {renderView()}
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>

    {/* Enhanced Notification Toast */}
    {notification && (
      <div
        className="
            fixed top-4 right-4 
            sm:top-6 sm:right-6
            bg-brand-accent 
            text-white 
            py-3 px-4 sm:py-4 sm:px-6
            rounded-xl 
            shadow-2xl 
            z-50 
            animate-fade-in-out
            backdrop-blur-sm
            border border-brand-accent-hover/20
            max-w-sm
            break-words
        "
        style={{
          top: "calc(1rem + var(--safe-area-inset-top, 0px))",
          right: "calc(1rem + var(--safe-area-inset-right, 0px))",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse-soft" />
          <span className="font-medium text-sm sm:text-base">
            {notification}
          </span>
        </div>
      </div>
    )}

    <GlobalSearch
      isOpen={isSearchOpen}
      onClose={() => setIsSearchOpen(false)}
      clients={clients}
      projects={projects}
      teamMembers={teamMembers}
      handleNavigation={handleNavigation}
    />

    <BottomNavBar
      activeView={activeView}
      handleNavigation={handleNavigation}
      currentUser={currentUser}
    />
  </div>
);
};

export default App;
