import { Footer } from "../components/Footer";
import { Booking } from "../components/landing/Booking";
import { Hero } from "../components/landing/Hero";
import { Manifesto } from "../components/landing/Manifesto";
import { Services } from "../components/landing/Services";
import { Works } from "../components/landing/Works";
import { Navbar } from "../components/Navbar";

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
