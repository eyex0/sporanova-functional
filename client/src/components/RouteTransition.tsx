/** Reference style: unobtrusive route transitions for the editorial public-site. Motion is brief, interruptible and disabled when users prefer reduced motion. */
import { ReactNode } from "react";
import { useLocation } from "wouter";
import "../pages/auth-flow.css";

export default function RouteTransition({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <div className="route-transition" key={location}>{children}</div>;
}
