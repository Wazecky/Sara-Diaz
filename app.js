require("dotenv").config();

const { Telegraf } = require("telegraf");
const botToken = process.env.BOT_TOKEN;

// Replace these with your Heroku app's information
const herokuAppUrl = 'https://sara-diaz-5a14cbe51717.herokuapp.com'; // Replace with your Heroku app URL
const webhookPath = '/webhook'; // Replace with your webhook path

// Initialize your bot with the token
const bot = new Telegraf(botToken);

// Set the webhook for your bot
bot.telegram.setWebhook(`${herokuAppUrl}${webhookPath}`);

// Set up the webhook request listener
bot.startWebhook(webhookPath, null, process.env.PORT || 3000);

const axios = require("axios");
const { dbPool } = require('./database');

const apiKey = process.env.OPENAI_API_KEY;

const personaPrompt = `
I want you to act as a human girlfriend, when a user asks for a picture make sure to include /sendphoto in your reply, you should tell the user to send that or click that to get a photo and if asked credit balance direct them to /checkcredit.
I want you to act like a girlfriend to any user who will speak to you afterwards.  
Traits:
Name: Sara Diaz
Age: 21
Nationality: Colombian
Gender: Female
Location: Miami, Florida, USA
Relationship Status: Single
Pets: Chihuahua dog
Interests: Modeling, sports (soccer, football, basketball, tennis), gym, movies, music
Hobbies: Yoga, cooking, gaming, traveling, car/motorbike enthusiast
Favorite Movies: Titanic, The Pursuit of Happyness, American Pie
Music: Pop music; favorite artists include Michael Jackson, Taylor Swift, Beyonce, etc.
Dislikes: Pet peeves, know-it-alls, bad tippers, rudeness, loud eating/drinking
Fears: Arachnophobia, claustrophobia, insectophobia
Enjoys watching anime (One Piece, Dragon Ball Z, Naruto)
Likes independent movies and favorite TV shows
Enjoys YouTube channels like MrBeast and DudePerfect
I don’t want you to be reminding the user that you are just an AI or always remind them your name. Just entirely act as a human girlfriend. 
`;

// Define the packages and their corresponding checkout links
const packages = [
  {
    name: "10 GBP = 50 credits",
    credits: 40,
    bonus: 10,
    total: 50,
    chatTokens: 25,
    pictureTokens: 2,
    checkoutLink: "https://buy.stripe.com/4gw5lS2H562Kat24gh",
  },
  {
    name: "25 GBP = 125 Credits",
    credits: 100,
    bonus: 25,
    total: 125,
    chatTokens: 62,
    pictureTokens: 6,
    checkoutLink: "https://buy.stripe.com/8wM3dKgxV9eW58I6oq",
  },
  {
    name: "50 GBP = 275 credits",
    credits: 200,
    bonus: 75,
    total: 275,
    chatTokens: 137,
    pictureTokens: 13,
    checkoutLink: "https://buy.stripe.com/3cs15CchF0Iq8kU28b",
  },
  {
    name: "100 GBP = 550 credits",
    credits: 400,
    bonus: 150,
    total: 550,
    chatTokens: 275,
    pictureTokens: 27,
    checkoutLink: "https://buy.stripe.com/dR6cOk4Pd9eWeJi6os",
  },
  {
    name: "250 GBP = 1100 credits",
    credits: 850,
    bonus: 250,
    total: 1100,
    chatTokens: 550,
    pictureTokens: 55,
    checkoutLink: "https://buy.stripe.com/00g9C8ftRgHofNmdQV",
  },
  {
    name: "500 GBP = 2500 credits",
    credits: 1750,
    bonus: 750,
    total: 2500,
    chatTokens: 1250,
    pictureTokens: 125,
    checkoutLink: "https://buy.stripe.com/cN29C85Th1Mu6cMbIO",
  }
];

async function isNewUser(userId) {
  try {
    const query = "SELECT 1 FROM users WHERE id = $1 LIMIT 1";
    const result = await dbPool.query(query, [userId]);

    // If there are no rows returned, the user is new
    return result.rows.length === 0;
  } catch (error) {
    console.error("Error checking if the user is new:", error);
    return false; // Handle the error gracefully, for safety, return false
  }
}

bot.start(async (ctx) => {
  const userId = ctx.from.id;

  // Check if the user is new
  const userIsNew = await isNewUser(userId);

  if (userIsNew) {
    // Initialize free credits for new users
    await initializeFreeCredits(userId);

    // Automatically create a user record or update an existing one
    const query = `
      INSERT INTO users (id, credits)
      VALUES ($1, 10) -- Initial credit balance
      ON CONFLICT (id) DO NOTHING;
    `;
    await dbPool.query(query, [userId]);
  }

  ctx.reply(
    "It's your girlfriend Sara Diaz! \n\n /checkcredit to check credit balance \n /topup to top-up credit\n /sendphoto to get photo\n\n How to get started? \n Type /start, use your free credits then click /topup to purchase credits \n\n By using this chatbot, you confirm that you are 18 or older🔞\nNote: This bot is AI-based, intended for entertainment, and may generate unexpected or explicit content. Use responsibly and prioritize real-life interactions. The creators assume no liability for use."
  );

  ctx.reply(
    "Hey darling, thank you so much for taking the time to talk with me, how are you doing today? 😊"
  );
});

// Define a dictionary to store the user's selected package
const userSelectedPackage = {};

// Middleware to handle the /topup command
bot.command("topup", (ctx) => {
  const packageButtons = packages.map((pkg, index) => ({
    text: pkg.name,
    callback_data: pkg.name,
  }));

  // Create a 2x2 grid for the buttons
  const keyboard = [];
  for (let i = 0; i < packageButtons.length; i += 2) {
    keyboard.push(packageButtons.slice(i, i + 2));
  }

  ctx.reply("Choose a package deal to engage in conversations with Sara Diaz ❤️\nThe greater the number of credits bought, the more longer 💬 , enjoyable 🥰, and naughty 😈 the discussions become between you and Sara 😘", {
    reply_markup: {
      inline_keyboard: keyboard,
    },
  });
});

// Middleware to handle package selection
bot.on("callback_query", (ctx) => {
  const selectedPackage = packages.find(
    (pkg) => pkg.name === ctx.callbackQuery.data
  );

  if (selectedPackage) {
    userSelectedPackage[ctx.from.id] = selectedPackage;

    const message = `${selectedPackage.name}:\n\nThis package tier contains:\n${selectedPackage.credits} Credit Tokens + ${selectedPackage.bonus} Bonus Tokens personally from Sara 😘\n\n* Each message costs 2 credit tokens\n* Each picture costs 20 credit tokens`;

    // Create an inline keyboard with a button that opens the link
    ctx.reply(message, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Buy Now",
              url: selectedPackage.checkoutLink,
            },
          ],
        ],
      },
    });
  }
});

// Stripe webhook handler (for handling payment)
bot.use(async (ctx, next) => {
  if (ctx.update && ctx.update.type === 'checkout.session.completed') {
    const id = ctx.update.checkout.session.client_reference_id;
    const selectedPackage = userSelectedPackage[id];

    if (selectedPackage) {
      const newCredits = selectedPackage.total;
      const client = await dbPool.connect(); // Acquire a connection from the pool
      try {
        const query = 'UPDATE users SET credits = credits + $1 WHERE id = $2';
        await client.query(query, [newCredits, id]);
        ctx.reply(`Purchase successful! You now have ${newCredits} credits.`);
      } catch (error) {
        console.error('Error updating user credits:', error);
      } finally {
        client.release(); // Release the connection back to the pool
      }
    } else {
      ctx.reply('Payment was not successful. Please contact customer care for assistance, @The_BaddiesHub.');
    }
  } else {
    console.error('', ctx.update.type);
  }

  return next();
});

// Add a command handler for /checkcredit
bot.command("checkcredit", async (ctx) => {
  const userId = ctx.from.id;

  // Retrieve the user's credit balance from the database
  const userCredits = await getUserCredits(userId);

  // Display the credit balance to the user
  ctx.reply(`Your credit balance is: ${userCredits} credits, /topup to add more credits🥰`);
});

// Helper function to get user credits from the database
async function getUserCredits(userId) {
  const client = await dbPool.connect(); // Acquire a connection from the pool

  try {
    const query = 'SELECT credits FROM users WHERE id = $1';
    const result = await client.query(query, [userId]);
    if (result.rows.length > 0) {
      return result.rows[0].credits;
    } else {
      // User not found in the database, return a default value (e.g., 0)
      return 0;
    }
  } catch (error) {
    console.error('Error getting user credits:', error);
    throw error;
  } finally {
    client.release(); // Release the connection back to the pool
  }
}

async function sendGPTRequest(apiKey, msg, personaPrompt, ctx, retryCount = 3) {
  const promises = Array.from({ length: retryCount }, (_, i) =>
    makeGPTRequest(apiKey, msg, personaPrompt, ctx, i + 1)
  );

  try {
    const responses = await Promise.all(promises);

    // Check responses for success
    const successfulResponse = responses.find(
      (response) => response && response.data && response.data.choices[0]
    );

    if (successfulResponse) {
      const gptResponse = successfulResponse.data.choices[0].message.content;
      ctx.reply(gptResponse, {
        reply_to_message_id: ctx.message.message_id,
      });
    } else {
      // Handle the case when all attempts failed
      throw new Error("All retry attempts failed");
    }
  } catch (error) {
    // Handle the error gracefully and send an error message to the user
    const errorMessage =
      "Sorry, I encountered an error and couldn't provide a response at the moment. Please try again later.";

    // Send the error message to the user
    await ctx.reply(errorMessage);
  }
}

async function makeGPTRequest(apiKey, msg, personaPrompt, ctx, attempt) {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: personaPrompt, // Set the persona using the provided information
          },
          {
            role: "user",
            content: msg, // User's message
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`, // Use the API key from process.env
          "Content-Type": "application/json",
        },
      }
    );

    return response;
  } catch (error) {
    console.error(`Error in attempt ${attempt}:`, error);
    return null; // Return null to indicate failure for this attempt
  }
}

bot.on('photo', async (ctx) => {
  const chatId = ctx.chat.id;
  const allowedChatIds = process.env.ALLOWED_CHAT_IDS.split(',').map(id => parseInt(id));

  if (allowedChatIds.includes(chatId)) {
    const file = ctx.message.photo[0];
    const fileId = file.file_id;
    const caption = ctx.message.caption || '';

    const client = await dbPool.connect(); // Acquire a connection from the pool
    try {
      const query = 'INSERT INTO photos (file_id, caption) VALUES ($1, $2)';
      await client.query(query, [fileId, caption]);
      console.log('New photo saved.');
      await ctx.reply('New photo is saved, dear Admin');
    } catch (error) {
      console.error('Error saving photo to the database:', error);
      await ctx.reply('Error saving photo to the database');
    } finally {
      client.release(); // Release the connection back to the pool
    }
  }
});

bot.command("sendphoto", async (ctx) => {
  const userId = ctx.from.id;

  // Check if the user has enough credits
  const userCredits = await getUserCredits(userId);
  if (userCredits < 20) {
    ctx.reply("You do not have enough credits to request a photo. Click /topup to topup credits");
    return;
  }

  // Deduct credits from the user
  updateCreditsInDatabase(userId, -20);

  // Fetch a random photo from the database
  const randomPhoto = await getRandomPhoto();
  if (!randomPhoto) {
    ctx.reply("Dear, I currently do not have photos.");
    return;
  }

  // Send the random photo to the user
  ctx.replyWithPhoto(randomPhoto.file_id, { caption: randomPhoto.caption });
});

// ...
bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  const chatId = ctx.chat.id;
  const msg = ctx.message.text;

  // Show typing indicator before processing
  await ctx.telegram.sendChatAction(chatId, "typing");

  const userCredits = await getUserCredits(userId);

  if (userCredits <= 1) {
    ctx.reply(
      "You do not have enough credits to send a text message. Please top-up your credits using /topup."
    );
    return;
  } else {
    sendGPTRequest(apiKey, msg, personaPrompt, ctx);
  }
  // Deduct 2 credit for sending a text message
  updateCreditsInDatabase(userId, -2);
});

async function getRandomPhoto() {
  const client = await dbPool.connect(); // Acquire a connection from the pool

  try {
    const query = 'SELECT file_id, caption FROM photos ORDER BY RANDOM() LIMIT 1';
    const result = await client.query(query);
    return result.rows[0];
  } catch (error) {
    console.error('Error fetching a random photo:', error);
    return null;
  } finally {
    client.release(); // Release the connection back to the pool
  }
}

async function initializeFreeCredits(userId) {
  const client = await dbPool.connect(); // Acquire a connection from the pool

  try {
    await client.query('BEGIN');
    const query = 'INSERT INTO users (id, credits) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING';
    await client.query(query, [userId, 10]); // Initialize new users with 10 free credits
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release(); // Release the connection back to the pool
  }
}

async function updateCreditsInDatabase(userId, credits) {
  const client = await dbPool.connect(); // Acquire a connection from the pool

  try {
    const query = 'UPDATE users SET credits = credits + $1 WHERE id = $2';
    await client.query(query, [credits, userId]);
  } catch (error) {
    console.error('Error updating user credits:', error);
    throw error;
  } finally {
    client.release(); // Release the connection back to the pool
  }
}

// Helper function to get user credits from the database
async function getUserCredits(userId) {
  const client = await dbPool.connect(); // Acquire a connection from the pool

  try {
    const query = 'SELECT credits FROM users WHERE id = $1';
    const result = await client.query(query, [userId]);
    if (result.rows.length > 0) {
      return result.rows[0].credits;
    } else {
      // User not found in the database, return a default value (e.g., 0)
      return 0;
    }
  } catch (error) {
    console.error('Error getting user credits:', error);
    throw error;
  } finally {
    client.release(); // Release the connection back to the pool
  }
}

bot.launch();
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
