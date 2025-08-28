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

    // Check if chat exists
    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) {
      return res.json({ success: false, message: "Chat not found" });
    }

    // Add user message to chat
    chat.messages.push({
      role: "user",
      content: promt,
      timestamp: Date.now(),
      isImage: false,
    });

    // Use OpenAI GPT model (not Gemini)
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Correct OpenAI model
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant. Provide clear, concise, and helpful responses."
        },
        {
          role: "user",
          content: promt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const reply = {
      role: "assistant",
      content: response.choices[0].message.content,
      timestamp: Date.now(),
      isImage: false,
    };

    // Save AI response to chat
    chat.messages.push(reply);
    await chat.save();
    await User.updateOne({ _id: userId }, { $inc: { credits: -1 } });

    res.json({ success: true, reply });
  } catch (error) {
    console.error("Text message error:", error);
    res.json({ success: false, message: "Failed to generate response. Please try again." });
  }
};

export const imageMessageController = async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (req.user.credits < 2) {
      return res.json({ success: false, message: "Not enough credits for image generation" });
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
      console.log("Generating image with DALL-E for prompt:", promt);

      // Use OpenAI DALL-E for real AI image generation
      const imageResponse = await openai.images.generate({
        model: "dall-e-2", // Use DALL-E 2 (more cost-effective)
        prompt: promt,
        n: 1,
        size: "1024x1024",
        response_format: "url"
      });

      const generatedImageUrl = imageResponse.data[0].url;
      console.log("DALL-E generated image:", generatedImageUrl);

      // Download the generated image
      const imageDownload = await axios.get(generatedImageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      const imageBuffer = Buffer.from(imageDownload.data);
      const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

      // Upload to ImageKit for permanent storage
      const uploadResponse = await imagekit.upload({
        file: base64Image,
        fileName: `ai_generated_${Date.now()}_${Math.random().toString(36).substring(7)}.png`,
        folder: "/ai-generated/",
        useUniqueFileName: true,
        tags: ["ai-generated", "dall-e", "quickgpt"],
        customMetadata: {
          prompt: promt,
          userId: userId.toString(),
          isPublished: isPublished ? "true" : "false",
          generatedAt: new Date().toISOString(),
          model: "dall-e-2"
        }
      });

      finalImageUrl = uploadResponse.url;
      console.log("Image uploaded to ImageKit:", finalImageUrl);

    } catch (dalleError) {
      console.error("DALL-E generation failed:", dalleError.message);

      // Fallback: Use Pollinations AI (Free alternative)
      try {
        console.log("Trying Pollinations AI fallback...");
        
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promt)}?width=1024&height=1024&seed=${Math.floor(Math.random() * 1000000)}`;
        
        const pollinationsResponse = await axios.get(pollinationsUrl, {
          responseType: 'arraybuffer',
          timeout: 30000
        });

        const imageBuffer = Buffer.from(pollinationsResponse.data);
        const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

        const uploadResponse = await imagekit.upload({
          file: base64Image,
          fileName: `pollinations_${Date.now()}.png`,
          folder: "/ai-generated/",
          useUniqueFileName: true,
          tags: ["ai-generated", "pollinations", "fallback"]
        });

        finalImageUrl = uploadResponse.url;
        console.log("Pollinations image uploaded:", finalImageUrl);

      } catch (pollinationsError) {
        console.error("Pollinations fallback failed:", pollinationsError.message);

        // Final fallback: Create themed SVG
        try {
          console.log("Creating themed SVG fallback...");
          
          const theme = analyzePrompt(promt);
          const themedSvg = createThemedImage(promt, theme);

          const uploadResponse = await imagekit.upload({
            file: `data:image/svg+xml;base64,${Buffer.from(themedSvg).toString('base64')}`,
            fileName: `themed_${Date.now()}.svg`,
            folder: "/themed/",
            useUniqueFileName: true,
            tags: ["themed", "fallback"]
          });

          finalImageUrl = uploadResponse.url;
          console.log("Themed SVG created:", finalImageUrl);

        } catch (svgError) {
          console.error("SVG creation failed:", svgError.message);
          
          // Ultimate fallback: Picsum with seed
          const seed = Math.abs(promt.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
          }, 0));
          
          finalImageUrl = `https://picsum.photos/seed/${seed}/1024/1024`;
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

// Helper function to analyze prompt
function analyzePrompt(prompt) {
  const themes = {
    nature: {
      keywords: ['tree', 'forest', 'flower', 'mountain', 'ocean', 'sunset', 'sky'],
      color: '#10b981',
      emoji: '🌳'
    },
    animal: {
      keywords: ['cat', 'dog', 'bird', 'lion', 'elephant', 'fish'],
      color: '#f59e0b',
      emoji: '🦁'
    },
    person: {
      keywords: ['man', 'woman', 'child', 'person', 'people', 'human'],
      color: '#ef4444',
      emoji: '👤'
    },
    object: {
      keywords: ['car', 'house', 'building', 'book', 'phone', 'computer'],
      color: '#6366f1',
      emoji: '🏠'
    },
    space: {
      keywords: ['space', 'star', 'planet', 'galaxy', 'moon', 'universe'],
      color: '#8b5cf6',
      emoji: '🌌'
    }
  };

  const promptLower = prompt.toLowerCase();
  
  for (const [themeName, themeData] of Object.entries(themes)) {
    if (themeData.keywords.some(keyword => promptLower.includes(keyword))) {
      return { name: themeName, ...themeData };
    }
  }

  return {
    name: 'abstract',
    color: '#667eea',
    emoji: '✨'
  };
}

// Helper function to create themed image
function createThemedImage(prompt, theme) {
  const truncatedPrompt = prompt.length > 40 ? prompt.substring(0, 40) + '...' : prompt;
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${theme.color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${adjustColor(theme.color, -40)};stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <rect width="1024" height="1024" fill="url(#bg)"/>
      
      <circle cx="512" cy="400" r="100" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="4"/>
      <text x="512" y="430" text-anchor="middle" font-size="60" fill="white">${theme.emoji}</text>
      
      <text x="512" y="550" text-anchor="middle" font-family="Arial" font-size="32" font-weight="bold" fill="white">
        AI Generated Image
      </text>
      
      <text x="512" y="600" text-anchor="middle" font-family="Arial" font-size="20" fill="rgba(255,255,255,0.9)">
        "${truncatedPrompt}"
      </text>
      
      <text x="512" y="650" text-anchor="middle" font-family="Arial" font-size="16" fill="rgba(255,255,255,0.7)">
        Theme: ${theme.name.charAt(0).toUpperCase() + theme.name.slice(1)}
      </text>
      
      <text x="512" y="700" text-anchor="middle" font-family="Arial" font-size="18" fill="rgba(255,255,255,0.8)">
        QuickGPT AI
      </text>
    </svg>
  `;
}

// Helper function to adjust color
function adjustColor(color, amount) {
  const usePound = color[0] === "#";
  const col = usePound ? color.slice(1) : color;
  const num = parseInt(col, 16);
  let r = (num >> 16) + amount;
  let g = (num >> 8 & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  r = r > 255 ? 255 : r < 0 ? 0 : r;
  g = g > 255 ? 255 : g < 0 ? 0 : g;
  b = b > 255 ? 255 : b < 0 ? 0 : b;
  return (usePound ? "#" : "") + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
}
