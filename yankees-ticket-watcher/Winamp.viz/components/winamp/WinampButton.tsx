"use client";

export default function WinampButton({
  children,
  className = "",
  title,
  onClick
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  onClick?: () => void;
}) {
  return (
    <button className={`wa-button ${className}`} title={title} onClick={onClick} type="button">
      {children}
    </button>
  );
}
