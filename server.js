const express = require('express');
const path = require('path');
const fs = require('fs');
const { OpenAI } = require('openai');
require('dotenv').config();
const ejs = require('ejs');
const sitemap = require('express-sitemap-xml').buildSitemaps;



const app = express();
const port = process.env.PORT || 3000;


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => {
  const recipesDir = path.join(__dirname, 'public', 'recipes');
  const recipeFiles = fs.readdirSync(recipesDir)
    .filter(file => file.endsWith('.html'))
    .sort((a, b) => fs.statSync(path.join(recipesDir, b)).mtime.getTime() - fs.statSync(path.join(recipesDir, a)).mtime.getTime())
    .slice(0, 10);

  const recentRecipesList = recipeFiles.map(file => {
    const dishName = file.slice(0, -5)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
    return `<li><a href="/recipes/${file}">${dishName}</a></li>`;
  }).join('');

  const indexHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recipe Creator</title>
      <meta name="description" content="Generate delicious recipes with our easy-to-use recipe generator. Discover a wide range of dishes and create your own personalized recipes.">
      <meta name="keywords" content="recipe generator, recipes, cooking, dishes, ingredients, instructions">
      <link rel="stylesheet" href="/styles.css">
      <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
    </head>
    <!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-9ZJEW3HXCH"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-9ZJEW3HXCH');
</script>
    <body>
      <header>
        <h1>Recipe Creator</h1>
        <nav>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/recipes">All Recipes</a></li>
          </ul>
        </nav>
      </header>
      <main>
    
        <section class="hero">
          <h2>Create a New Recipe</h2>
          <form id="recipe-form">
            <label for="dish-name">Enter a dish name:</label>
            <i>for example: chicken parmesan, chocolate chip cookies</i>
            <br>
            <input type="text" id="dish-name" name="dish-name" required>
            <button type="submit">Create Recipe</button>
          </form>
        </section>

<br>


        <section class="recent-recipes">
          <h2>Latest Recipes</h2>
          <ul>
            ${recentRecipesList}
          </ul>
        </section>
      </main>
      <footer>
        <p>&copy; 2024 Recipe Creator. All rights reserved.</p>
      </footer>
      <script src="/script.js"></script>
    </body>
    </html>
  `;

  res.send(indexHtml);
});





// Add this route before the /generate-recipe route
app.get('/recipes', (req, res) => {
  const recipesDir = path.join(__dirname, 'public', 'recipes');
  const recipeFiles = fs.readdirSync(recipesDir).filter(file => file.endsWith('.html'));

  const recipeList = recipeFiles.map(file => {
    const dishName = file.slice(0, -5)
      .replace(/-/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
    return `
      <li>
        <a href="/recipes/${file}">
          <div class="recipe-item">
            <h3>${dishName}</h3>
          </div>
        </a>
      </li>
    `;
  }).join('');

  const recipesHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>All Recipes</title>
        <link rel="stylesheet" href="/styles.css">
        <meta name="description" content="Explore our collection of generated recipes. Browse through a variety of dishes and find inspiration for your next meal.">
        <meta name="keywords" content="recipes, generated recipes, dishes, cooking, ingredients, instructions">
       
        <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
      </head>
      <!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-9ZJEW3HXCH"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-9ZJEW3HXCH');
</script>
      <body>
        <header>
          <h1>Recipe Generator</h1>
          <nav>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/recipes">All Recipes</a></li>
            </ul>
          </nav>
        </header>
        <main>
          <h2>All Recipes</h2>
          <ul class="recipe-list">
            ${recipeList}
          </ul>
        </main>
        <footer>
          <p>&copy; 2024 Recipe Generator. All rights reserved.</p>
        </footer>
      </body>
    </html>
  `;

  res.send(recipesHtml);
});



app.get('/generate-recipe', async (req, res) => {
  const dishName = req.query.dish;
  const prompt = `You are an AI assistant that generates recipes based on a given dish name. 
  You write in a serious but friendly tone, and you provide clear and concise instructions. You write in the style of Gordon Ramsay and Serious Eats.
  Please generate a recipe for the following dish: "${dishName}"

  Include the following sections in the generated recipe:
  - ${dishName}
  - Introduction: Provide an introduction to the recipe, including the dish name and any relevant background information. Make it 5-10 sentences long. Add joke if possible.
  - Ingredients: List the ingredients required for the recipe.
  - Cooking Time: Specify the cooking time for the recipe.
  - Instructions: Provide step-by-step instructions to make the recipe. Make sure each step is on a new line.
  - Tips: Provide any additional details, tips or other ideas on how to improve the recipe.

  Format the sections as follows:
  - All text should be in HTML format.
  - Format Introduction as a blockquote in italic text. Do not include the word "Introduction".
  - Dish name should be in H1 and there shouldn't be any other text before it.
  - Use <h2> tags for the main sections (e.g., Ingredients, Cooking Time, Instructions).
  - Use <h3> tags for any subsections within the main sections.
  - Use <strong> tags to make important text or phrases bold.
  - Format ingredients list as a table, with bold headers and borders
  - Format Instructions as a list of steps with each step on a new line.
  - Format Tips as a html-formatted bulleted list of tips with each tip on a new line. 

  `;

  try {
    const messages = [
      { role: 'user', content: prompt }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125",
      messages: messages,
      temperature: 0,
      max_tokens: 3000
    });

    const recipeHtml = response.choices[0].message.content.trim();
    const fileName = `${dishName.toLowerCase().replace(/\s+/g, '-')}.html`;
    const filePath = path.join(__dirname, 'public', 'recipes', fileName);

    ejs.renderFile('views/recipe.ejs', { dishName, recipeHtml }, (err, html) => {
      if (err) {
        console.error('Error rendering EJS template:', err);
        res.status(500).send('An error occurred while generating the recipe.');
      } else {
        fs.writeFileSync(filePath, html, 'utf8');
        res.redirect(`/recipes/${fileName}`);
      }
    });
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    res.status(500).send('An error occurred while generating the recipe.');
  }
});

app.get('/sitemap.xml', (req, res) => {
  const baseUrl = 'https://recipebotpro.com'; // Replace with your website's base URL

  const staticUrls = [
    { url: '/', changefreq: 'daily', priority: 1 },
    { url: '/recipes', changefreq: 'daily', priority: 0.9 },
  ];

  const recipesDir = path.join(__dirname, 'public', 'recipes');
  const recipeFiles = fs.readdirSync(recipesDir).filter(file => file.endsWith('.html'));
  const dynamicUrls = recipeFiles.map(file => ({
    url: `/recipes/${file}`,
    changefreq: 'weekly',
    priority: 0.8,
    lastmod: fs.statSync(path.join(recipesDir, file)).mtime.toISOString(),
  }));

  const urls = [...staticUrls, ...dynamicUrls];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls.map(url => `
        <url>
          <loc>${baseUrl}${url.url}</loc>
          <lastmod>${url.lastmod || new Date().toISOString()}</lastmod>
          <changefreq>${url.changefreq}</changefreq>
          <priority>${url.priority}</priority>
        </url>
      `).join('')}
    </urlset>
  `;

  res.header('Content-Type', 'application/xml');
  res.send(sitemap);
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
