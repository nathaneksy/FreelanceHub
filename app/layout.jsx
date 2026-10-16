import "./styles.css";
export const metadata = {
  title: "FreelanceHub | A little more in sync",
  description:
    "Your clients, projects, and next steps. Together in one workspace.",
};
export default function Layout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
