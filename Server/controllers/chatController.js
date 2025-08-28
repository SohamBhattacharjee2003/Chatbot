import Chat from "../models/chat.js";

export const createChat = async (req, res) => {
    try{
        const userId = req.user.id;  

        const chatDate = {
            userId,
            message: [],
            name : "New Chat",
            userName : req.user.name
        }

        await Chat.create(chatDate);
        res.json({success: true , message : "Chat created successfully"});
    }
    catch(error)
    {
        return res.json({success: false , message: error.message})
    }
}

export const getChats = async (req, res) => {
    try{
        const userId = req.user.id;  
        const chats = await Chat.find({ userId }).sort({ createdAt: -1 });
        res.json({success: true , chats})
    }
    catch(error)
    {
        return res.json({success: false , message: error.message})
    }
}

export const deleteChat = async (req, res) => {
    try{
        const userId = req.user.id;
        const { chatId } = req.body;
        await Chat.findByIdAndDelete({_id: chatId , userId});
        res.json({success: true , message : "Chat deleted successfully"});
    }
    catch(error)
    {
        return res.json({success: false , message: error.message})
    }
}