import { Navbar } from "../components/landing/Navbar";
import { Hero } from "../components/landing/Hero";
import { Services } from "../components/landing/Services";
import { Manifesto } from "../components/landing/Manifesto";
import { Works } from "../components/landing/Works";
import { Booking } from "../components/landing/Booking";
import { Footer } from "../components/landing/Footer";

export function LandingPage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Services />
      <Manifesto />
      <Works />
      <Booking />
      <Footer />
    </main>
  );
}
