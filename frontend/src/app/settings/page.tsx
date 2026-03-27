"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type Theme = "light" | "dark" | "system";
type Currency = "INR" | "USD" | "EUR" | "GBP";

interface Notifications {
  marketAlerts: boolean;
  rebalancingReminders: boolean;
  goalMilestones: boolean;
}

interface PasswordForm {
  current: string;
  newPassword: string;
  confirm: string;
}

/* ------------------------------------------------------------------ */
/*  Toggle switch                                                      */
/* ------------------------------------------------------------------ */
function Toggle({
  checked,
  onChange,
  id,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          checked ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                    */
/* ------------------------------------------------------------------ */
function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <Card>
        <h2 id={id} className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {title}
        </h2>
        {children}
      </Card>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete confirmation dialog                                         */
/* ------------------------------------------------------------------ */
function DeleteDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
        <h3
          id="delete-dialog-title"
          className="text-lg font-bold text-red-600 dark:text-red-400 mb-2"
        >
          Delete Account
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          This action is irreversible. All your data, portfolios, goals, and history will be
          permanently deleted. Are you sure you want to proceed?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Yes, Delete My Account
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main settings page                                                 */
/* ------------------------------------------------------------------ */
export default function SettingsPage() {
  /* ---------- appearance ---------- */
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved) setTheme(saved);
  }, []);

  const changeTheme = useCallback((t: Theme) => {
    setTheme(t);
    localStorage.setItem("theme", t);

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = t === "dark" || (t === "system" && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  /* ---------- notifications ---------- */
  const [notifications, setNotifications] = useState<Notifications>({
    marketAlerts: true,
    rebalancingReminders: true,
    goalMilestones: true,
  });

  useEffect(() => {
    const saved = localStorage.getItem("notification_prefs");
    if (saved) {
      try {
        setNotifications(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const updateNotification = useCallback(
    (key: keyof Notifications, value: boolean) => {
      const updated = { ...notifications, [key]: value };
      setNotifications(updated);
      localStorage.setItem("notification_prefs", JSON.stringify(updated));
    },
    [notifications],
  );

  /* ---------- currency ---------- */
  const currencies: Currency[] = ["INR", "USD", "EUR", "GBP"];
  const currencyLabels: Record<Currency, string> = {
    INR: "Indian Rupee (INR)",
    USD: "US Dollar (USD)",
    EUR: "Euro (EUR)",
    GBP: "British Pound (GBP)",
  };

  const [currency, setCurrency] = useState<Currency>("INR");

  useEffect(() => {
    const saved = localStorage.getItem("display_currency") as Currency | null;
    if (saved && currencies.includes(saved)) setCurrency(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeCurrency = useCallback((c: Currency) => {
    setCurrency(c);
    localStorage.setItem("display_currency", c);
  }, []);

  /* ---------- password ---------- */
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    current: "",
    newPassword: "",
    confirm: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (passwordForm.newPassword !== passwordForm.confirm) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    setPasswordLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          current_password: passwordForm.current,
          new_password: passwordForm.newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to change password.");
      }

      setPasswordSuccess("Password changed successfully.");
      setPasswordForm({ current: "", newPassword: "", confirm: "" });
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setPasswordLoading(false);
    }
  };

  /* ---------- delete account ---------- */
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteAccount = async () => {
    try {
      const token = localStorage.getItem("access_token");
      await fetch("/api/v1/auth/delete-account", {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      localStorage.clear();
      window.location.href = "/login";
    } catch {
      /* best-effort */
      localStorage.clear();
      window.location.href = "/login";
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

        {/* ---- Appearance ---- */}
        <Section id="settings-appearance" title="Appearance">
          <fieldset>
            <legend className="sr-only">Theme preference</legend>
            <div className="flex flex-wrap gap-3">
              {(["light", "dark", "system"] as Theme[]).map((t) => (
                <label
                  key={t}
                  className={`flex items-center gap-2 cursor-pointer rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-blue-500 ${
                    theme === t
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={t}
                    checked={theme === t}
                    onChange={() => changeTheme(t)}
                    className="sr-only"
                  />
                  <span className="capitalize">{t}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </Section>

        {/* ---- Notifications ---- */}
        <Section id="settings-notifications" title="Notifications">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            <Toggle
              id="notif-market"
              label="Market Alerts"
              checked={notifications.marketAlerts}
              onChange={(v) => updateNotification("marketAlerts", v)}
            />
            <Toggle
              id="notif-rebalance"
              label="Rebalancing Reminders"
              checked={notifications.rebalancingReminders}
              onChange={(v) => updateNotification("rebalancingReminders", v)}
            />
            <Toggle
              id="notif-goals"
              label="Goal Milestones"
              checked={notifications.goalMilestones}
              onChange={(v) => updateNotification("goalMilestones", v)}
            />
          </div>
        </Section>

        {/* ---- Currency ---- */}
        <Section id="settings-currency" title="Display Currency">
          <label htmlFor="currency-select" className="sr-only">
            Select display currency
          </label>
          <select
            id="currency-select"
            value={currency}
            onChange={(e) => changeCurrency(e.target.value as Currency)}
            className="w-full sm:w-64 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {currencies.map((c) => (
              <option key={c} value={c}>
                {currencyLabels[c]}
              </option>
            ))}
          </select>
        </Section>

        {/* ---- Account ---- */}
        <Section id="settings-account" title="Account">
          {/* change password */}
          <form onSubmit={handlePasswordSubmit} className="space-y-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Change Password
            </h3>

            {passwordError && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {passwordError}
              </p>
            )}
            {passwordSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400" role="status">
                {passwordSuccess}
              </p>
            )}

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="current-password"
                  className="block text-sm text-gray-600 dark:text-gray-400 mb-1"
                >
                  Current Password
                </label>
                <input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={passwordForm.current}
                  onChange={(e) =>
                    setPasswordForm((f) => ({ ...f, current: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-sm text-gray-600 dark:text-gray-400 mb-1"
                >
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-sm text-gray-600 dark:text-gray-400 mb-1"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={passwordForm.confirm}
                  onChange={(e) =>
                    setPasswordForm((f) => ({ ...f, confirm: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {passwordLoading ? "Saving..." : "Update Password"}
            </button>
          </form>

          <hr className="border-gray-200 dark:border-gray-700 my-4" />

          {/* export data */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Export My Data
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Download a complete export of your portfolio and advisory data.
              </p>
            </div>
            <a
              href="/api/v1/report/download"
              className="inline-flex items-center justify-center px-5 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Download Report
            </a>
          </div>

          <hr className="border-gray-200 dark:border-gray-700 my-4" />

          {/* delete account */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">
                Delete Account
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Permanently remove your account and all associated data.
              </p>
            </div>
            <button
              onClick={() => setDeleteDialogOpen(true)}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              Delete Account
            </button>
          </div>
        </Section>

        {/* ---- About ---- */}
        <Section id="settings-about" title="About">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">App Version</dt>
              <dd className="font-mono text-gray-900 dark:text-gray-100">3.0.0</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Documentation</dt>
              <dd>
                <a
                  href="/docs"
                  className="text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                >
                  View Docs
                </a>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">API Reference</dt>
              <dd>
                <a
                  href="/api/docs"
                  className="text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                >
                  Swagger UI
                </a>
              </dd>
            </div>
          </dl>
        </Section>
      </div>

      <DeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteAccount}
      />
    </AppShell>
  );
}
