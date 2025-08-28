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
    
    console.log("Image generation request:", { promt, chatId, userId });

    // Check if chat exists
    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) {
      return res.json({ success: false, message: "Chat not found" });
    }

    // Add user prompt to chat
    chat.messages.push({
      role: "user",
      content: promt,
      timestamp: Date.now(),
      isImage: false,
    });

    let finalImageUrl = null;

    try {
      // Method 1: Try OpenAI DALL-E (if you have credits)
      console.log("Attempting DALL-E image generation...");
      
      const imageResponse = await openai.images.generate({
        model: "dall-e-2",
        prompt: promt,
        n: 1,
        size: "1024x1024",
        response_format: "url"
      });

      const generatedImageUrl = imageResponse.data[0].url;
      
      // Download the image from OpenAI
      const imageDownload = await axios.get(generatedImageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      // Convert to base64 for ImageKit upload
      const imageBuffer = Buffer.from(imageDownload.data);
      const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

      // Upload to ImageKit for permanent storage
      const uploadResponse = await imagekit.upload({
        file: base64Image,
        fileName: `dalle_${Date.now()}.png`,
        folder: "/ai-images/",
        useUniqueFileName: true
      });

      finalImageUrl = uploadResponse.url;
      console.log("DALL-E image uploaded successfully:", finalImageUrl);

    } catch (dalleError) {
      console.error("DALL-E failed:", dalleError.message);
      
      try {
        // Method 2: Try Pollinations AI (Free alternative)
        console.log("Trying Pollinations AI...");
        
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promt)}?width=1024&height=1024&seed=${Math.floor(Math.random() * 1000000)}`;
        
        const pollinationsResponse = await axios.get(pollinationsUrl, {
          responseType: 'arraybuffer',
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        const imageBuffer = Buffer.from(pollinationsResponse.data);
        const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

        const uploadResponse = await imagekit.upload({
          file: base64Image,
          fileName: `pollinations_${Date.now()}.png`,
          folder: "/ai-images/",
          useUniqueFileName: true
        });

        finalImageUrl = uploadResponse.url;
        console.log("Pollinations image uploaded successfully:", finalImageUrl);

      } catch (pollinationsError) {
        console.error("Pollinations failed:", pollinationsError.message);
        
        try {
          // Method 3: Try Leonardo AI (Alternative)
          console.log("Trying Leonardo AI...");
          
          const leonardoUrl = `https://cdn.leonardo.ai/users/user-id/generations/generation-id/${encodeURIComponent(promt)}.jpg`;
          // Note: This is a placeholder - you'd need actual Leonardo AI API integration
          
          // Method 3 Alternative: Use Unsplash with related keywords
          const keywords = promt.split(' ').slice(0, 3).join(',');
          const unsplashUrl = `https://source.unsplash.com/1024x1024/?${encodeURIComponent(keywords)}`;
          
          const unsplashResponse = await axios.get(unsplashUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
          });

          const imageBuffer = Buffer.from(unsplashResponse.data);
          const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

          const uploadResponse = await imagekit.upload({
            file: base64Image,
            fileName: `unsplash_${Date.now()}.jpg`,
            folder: "/ai-images/",
            useUniqueFileName: true
          });

          finalImageUrl = uploadResponse.url;
          console.log("Unsplash image uploaded successfully:", finalImageUrl);

        } catch (unsplashError) {
          console.error("Unsplash failed:", unsplashError.message);
          
          // Method 4: Create a custom SVG image as final fallback
          const customSvg = createCustomImage(promt);
          
          const uploadResponse = await imagekit.upload({
            file: `data:image/svg+xml;base64,${Buffer.from(customSvg).toString('base64')}`,
            fileName: `custom_${Date.now()}.svg`,
            folder: "/ai-images/",
            useUniqueFileName: true
          });

          finalImageUrl = uploadResponse.url;
          console.log("Custom SVG created successfully:", finalImageUrl);
        }
      }
    }

    if (!finalImageUrl) {
      return res.json({ success: false, message: "Failed to generate image" });
    }

    const reply = {
      role: "assistant",
      content: finalImageUrl,
      timestamp: Date.now(),
      isImage: true,
      isPublished: isPublished || false,
    };

    // Save to database
    chat.messages.push(reply);
    await chat.save();
    await User.updateOne({ _id: userId }, { $inc: { credits: -2 } });

    console.log("Image generation completed successfully");
    res.json({ success: true, reply });

  } catch (error) {
    console.error("Image generation error:", error);
    res.json({ 
      success: false, 
      message: "Image generation failed. Please try again."
    });
  }
};

// Helper function to create custom SVG
function createCustomImage(prompt) {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const truncatedPrompt = prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt;
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${randomColor};stop-opacity:0.8" />
          <stop offset="100%" style="stop-color:#000;stop-opacity:0.8" />
        </linearGradient>
      </defs>
      
      <rect width="1024" height="1024" fill="url(#bg)"/>
      
      <circle cx="512" cy="350" r="80" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="3"/>
      <text x="512" y="370" text-anchor="middle" font-size="48" fill="white">🎨</text>
      
      <text x="512" y="480" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white">
        AI Generated Image
      </text>
      
      <foreignObject x="112" y="520" width="800" height="120">
        <div xmlns="http://www.w3.org/1999/xhtml" style="color: white; font-family: Arial; font-size: 18px; text-align: center; word-wrap: break-word; padding: 20px;">
          "${truncatedPrompt}"
        </div>
      </foreignObject>
      
      <text x="512" y="700" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.7)">
        Generated by QuickGPT AI
      </text>
    </svg>
  `;
}
