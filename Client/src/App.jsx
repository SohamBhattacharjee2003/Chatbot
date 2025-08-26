import React from "react";
import Sidebar from "./components/Sidebar";
import Chatbox from "./components/Chatbox";
import Credit from "./pages/Credits";
import Community from "./pages/Community";
import { Routes, Route, useLocation } from "react-router-dom";
import { assets } from "./assets/assets";
import './assets/prism.css';
import Loading from "./pages/Loading";
import { useAppContext } from "./context/AppContext";
import Login from "./pages/Login";

function App() {

  const {user} = useAppContext();

  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const {pathname} = useLocation();

  if(pathname === '/loading') return <Loading />
  return (
    <>
      {!isMenuOpen && <img src={assets.menu_icon} className="absolute top-3 left-3 w-8 h-8 cursor-pointer md:hidden not-dark:invert" onClick={() => setIsMenuOpen(true)}/>}

      { user ? (<div className="dark:bg-gradient-to-b from-[#242124] to-[#000000] dark:text-white">
        <div className="flex h-screen w-screen">
          <Sidebar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
          <Routes>
            <Route path="/" element={<Chatbox />} />
            <Route path="/credits" element={<Credit />} />
            <Route path="/community" element={<Community />} />
          </Routes>
        </div>
      </div>) 
      :
       (
       <div className="bg-gradient-to-b from-[#242124] to-[#000000] flex items-center justify-center h-screen w-screen">
        <Login />
       </div>
       )}
      
    </>
  );
}

export default App;
