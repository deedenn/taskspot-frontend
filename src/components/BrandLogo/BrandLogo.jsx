import "./BrandLogo.css";

export function BrandLogo({ compact = false, className = "", variant = "default" }) {
  const logoClassName = [
    "brand-logo",
    compact ? "brand-logo--compact" : "",
    variant === "light" ? "brand-logo--light" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={logoClassName}>
      <img
        src={compact ? "/brand/taskspot-icon.png" : "/brand/taskspot-logo.png"}
        alt="Taskspot"
      />
    </span>
  );
}
