import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import Kiosk from "@/pages/Kiosk";
import Kids from "@/pages/Kids";
import Parent from "@/pages/Parent";
import List from "@/pages/List";
import Guest from "@/pages/Guest";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/kiosk" replace />} />
        <Route path="/kiosk" element={<Kiosk />} />
        <Route path="/kids" element={<Kids />} />
        <Route path="/parent" element={<Parent />} />
        <Route path="/list" element={<List />} />
        <Route path="/guest" element={<Guest />} />
      </Route>
    </Routes>
  );
}
