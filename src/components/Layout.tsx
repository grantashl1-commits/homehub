import { NavLink, Outlet } from "react-router-dom";

const nav = [
  { to: "/kiosk", label: "Kiosk" },
  { to: "/kids", label: "Kids" },
  { to: "/parent", label: "Parent" },
  { to: "/list", label: "Shopping list" },
  { to: "/guest", label: "Guest" },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Temporary dev navigation — remove for the kiosk. */}
      <nav className="flex flex-wrap gap-2 border-b p-3">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                "rounded-full px-4 py-2 text-sm font-medium",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary",
              ].join(" ")
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
