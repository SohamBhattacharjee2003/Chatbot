import User from "../models/user.js";
import Chat from "../models/chat.js";
import axios from "axios";
import imagekit from "../configs/imagekit.js";
import openai from "../configs/openai.js";

export const textMessageController = async (req, res) => {
  try {
    const userId = req.user.id;

    if (req.user.credits < 1) {
      return res.json({ success: false, message: "You don't have enough credits" });
    }

    const { chatId, promt } = req.body;

    // Fix: Check if chat exists
    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) {
      return res.json({ success: false, message: "Chat not found" });
    }

    // Fix: Use messages instead of message
    chat.messages.push({
      role: "user",
      content: promt,
      timestamp: Date.now(),
      isImage: false,
    });

    // For Gemini AI through OpenAI wrapper
    const response = await openai.chat.completions.create({
      model: "gemini-1.5-flash", // Fix: Use correct Gemini model name
      messages: [
        {
          role: "user",
          content: promt,
        },
      ],
    });

    const reply = {
      role: "assistant",
      content: response.choices[0].message.content, // Fix: Access content properly
      timestamp: Date.now(),
      isImage: false,
    };

    // Fix: Save to database before sending response
    chat.messages.push(reply); // Fix: Use messages instead of message
    await chat.save();
    await User.updateOne({ _id: userId }, { $inc: { credits: -1 } }); // Fix: Use _id instead of id

    res.json({ success: true, reply });
  } catch (error) {
    console.error("Text message error:", error);
    res.json({ success: false, message: error.message });
  }
};

export const imageMessageController = async (req, res) => {
  try {
    const userId = req.user.id;
    if (req.user.credits < 2) {
      return res.json({ success: false, message: "Not enough credits" });
    }

    const { promt, chatId, isPublished } = req.body;
    
    // Fix: Use _id instead of id in query
    const chat = await Chat.findOne({ _id: chatId, userId });
    
    if (!chat) {
      return res.json({ success: false, message: "Chat not found" });
    }

    // Fix: User input is text, not image
    chat.messages.push({
      role: "user",
      content: promt,
      timestamp: Date.now(),
      isImage: false, // Fix: User prompt is text
    });

    const encodedPromt = encodeURIComponent(promt);
    const generateImageUrl = `${process.env.IMAGEKIT_URL_ENDPOINT}/ik-genimg-prompt-${encodedPromt}/quickgpt/${Date.now()}.png?tr=w-800`;

    const aiImageResponse = await axios.get(generateImageUrl, {
      responseType: "arraybuffer",
    });

    const base64Image = `data:image/png;base64,${Buffer.from(
      aiImageResponse.data,
      "binary"
    ).toString("base64")}`;

    const uploadResponse = await imagekit.upload({
      file: base64Image,
      fileName: `${Date.now()}.png`,
      folder: "quickgpt",
    });

    const reply = {
      role: "assistant",
      content: uploadResponse.url,
      timestamp: Date.now(),
      isImage: true,
      isPublished,
    };

    chat.messages.push(reply);
    await chat.save();
    await User.updateOne({ _id: userId }, { $inc: { credits: -2 } });

    res.json({ success: true, reply });
  } catch (error) {
    console.error("Image message error:", error);
    res.json({ success: false, message: error.message });
  }
};
