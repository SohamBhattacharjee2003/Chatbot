import React, { useState, useEffect, useRef } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { assets } from "../assets/assets.js";
import Message from "./Message.jsx";
import toast from "react-hot-toast";

function Chatbox() {

    const containerRef = useRef(null);

  const { selectedChat, theme , user , axios , token , setUser } = useAppContext();

  const [message, setMessage] = useState([]);
  const [loading, setLoading] = useState(false);

  const [ promt , setPromt ] = useState();
  const [ mode , setMode] = useState("text");
  const [ isPublished , setIsPublished ] = useState(false);

  const onSubmit = async (e) => {
    try{
      e.preventDefault();
      setLoading(true);
      if(!user) return toast('Login to send message');
      setLoading(true);
      const promtCopy = promt;
      setPromt('');
      setMessage(prev => [...prev , { role : 'user' , content : promt , timestamp : Date.now , isImage :false }]);
      const {data} = await axios.post(`/api/message/${mode}`,{chatId: selectedChat._id , promt , isPublished} , {headers:{ Authorization : token }});

      if(data.success)
      {
        setMessage(prev => [...prev , data.reply]);
        if(mode === 'image')
        {
          setUser(prev => ({...prev , credits : prev.credits -2}));
        }
        else
        {
          setUser(prev => ({...prev , credits : prev.credits -1}));
        }
      }
      else{
        toast.error(data.message);
        setPromt(promtCopy);
      }
    }
    catch(error){
      toast.error(error.message);
    }
    finally{
      setPromt('');
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedChat) {
      setMessage(selectedChat.messages);
    }
  }, [selectedChat]);

  useEffect(() => {
    if (containerRef.current) {
        containerRef.current.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior: 'smooth',
        })
    }}, [message]);

  return (
    <div className="flex-1 flex flex-col justify-between m-5 md:m-10 xl:mx-30 max-md:mt-14 2xl:pr-40">

      <div ref={containerRef} className="flex-1 mb-5 overflow-y-scroll">
        {message.length === 0 && (
          <div className="flex flex-col justify-center items-center h-full gap-2">
            <img
              src={theme === "dark" ? assets.logo_full : assets.logo_full_dark}
              className="w-full max-w-56 sm:max-w-68"
            />
            <p className="mt-5 text-4xl sm:text-6xl text-center text-gray-400 dark:text-white">
              Ask Me Anything
            </p>
          </div>
        )}

        {message.map((msg , index) => <Message key={index} message={msg} />)}

        {
            loading && <div className="loader flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-500 dark::bg-white animate-bounce"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-gray-500 dark::bg-white animate-bounce"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-gray-500 dark::bg-white animate-bounce"></div>
            </div>
        }
      </div>

      {mode === 'image' && (
        <label className="inline-flex items-center gap-2 mb-3 text-sm mx-auto">
            <p className="text-xs">Publish Generated Image to Community</p>
            <input type="checkbox" className="cursor-pointer" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
        </label>
      )}

      <form className="bg-primary/20 dark:bg-[#583C79]/30 border border-primary dark:border-[#80609F]/30 rounded-full w-full max-w-2xl p-3 pl-4 mx-auto flex gap-4 items-center" onSubmit={onSubmit}>
        <select onChange={(e) => setMode(e.target.value)} value={mode} name="" id="" className="text-sm pl-3 pr-2 outline-none">
            <option className="dark:bg-purple-900" value="text">Text</option>
            <option className="dark:bg-purple-900" value="image">Image</option>
        </select>
        <input type="text" placeholder="Type your prompt here...." className="flex-1 w-full. text-sm outline-none" required onChange={(e) => setPromt(e.target.value)} value={promt} />
        <button disabled={loading}>
            <img src={loading ? assets.stop_icon : assets.send_icon} className="w-8 cursor-pointer" />
        </button>
      </form>
    </div>
  );
}

export default Chatbox;
