import { Link, Navigate, Route, Routes, useLocation, useParams, useSearchParams } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import CartFab from './components/CartFab.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import PromoPopup from './components/PromoPopup.jsx';
import Home from './pages/Home.jsx';
import ProductPage from './pages/ProductPage.jsx';
import Checkout from './pages/Checkout.jsx';
import Confirmation from './pages/Confirmation.jsx';
import Rastreo from './pages/Rastreo.jsx';
import Account from './pages/Account.jsx';
import AdminApp from './pages/admin/AdminApp.jsx';

const NotFound = () => (
  <div className="py-24 text-center">
    <p className="text-5xl font-extrabold text-slate-300">404</p>
    <Link to="/" className="mt-4 inline-block font-medium text-brand-600">Volver a la tienda</Link>
  </div>
);

// Enlaces antiguos /seguimiento/HN-1042?t=... → nuevo /rastreo
function OldTracking() {
  const { code } = useParams();
  const [params] = useSearchParams();
  return <Navigate replace to={`/rastreo?code=${code}&t=${params.get('t') || ''}`} />;
}

export default function App() {
  const { pathname } = useLocation();

  // El panel de administración ocupa toda la pantalla (sin header, footer ni carrito)
  if (pathname.startsWith('/admin')) {
    return (
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/producto/:slug" element={<ProductPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/pedido/:code" element={<Confirmation />} />
          <Route path="/rastreo" element={<Rastreo />} />
          <Route path="/cuenta" element={<Account />} />
          <Route path="/seguimiento/:code" element={<OldTracking />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <CartFab />
      <CartDrawer />
      <PromoPopup />
    </div>
  );
}
