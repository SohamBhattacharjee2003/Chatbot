import { createContext, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";


axios.defaults.baseURL = import.meta.env.VITE_SERVER_URL;

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [loadingUser, setLoadingUser] = useState(true);

  const fetchUser = async () => {
    try {
      const { data } = await axios.get('/api/user/data', {headers: { Authorization: token}});
      if(data.success){
        setUser(data.user);
      }
      else
      {
          toast.error(data.message);
      }
    } catch (error) {
        toast.error(error.message);
    }
    finally{
      setLoadingUser(false);
    }
  };
  

  const createNewChat = async () => {
    try {
      if(!user) return toast('Login to create a new chat');
      navigate('/');
      await axios.get('/api/chat/create', {headers: { Authorization: token}});
      await fetchUsersChats();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const fetchUsersChats = async () => {
    try {
      const { data } = await axios.get('/api/chat/get', {headers: {Authorization: token}});
      if(data.success)
      {
        setChats(data.chats);
        if(data.chats.length === 0)
        {
          await createNewChat();
          await fetchUsersChats();
        }
        else
        {
          setSelectedChat(data.chats[0]);
        }
      }
      else
      {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if(token)
    {
      fetchUser();
    }
    else
    {
      setUser(null);
      setLoadingUser(false);
    }
  }, [token]);
  
  useEffect(() => {
    if (user) {
      fetchUsersChats();
    } else {
      setChats([]);
      setSelectedChat(null);
    }
  }, [user]);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);
  
  const value = {
    user,
    setUser,
    chats,
    setChats,
    selectedChat,
    setSelectedChat,
    theme,
    setTheme,
    fetchUser,
    navigate,
    token,
    setToken,
    createNewChat,
    loadingUser,
    fetchUsersChats,
    axios
  };

  return (
    <AppContext.Provider value={value}>{children}</AppContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAppContext = () => useContext(AppContext);
