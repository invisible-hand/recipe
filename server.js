const express = require('express');
const path = require('path');
const fs = require('fs');
const { OpenAI } = require('openai');
require('dotenv').config();

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

  const recipeList = recipeFiles.map(file => {
    const dishName = file.slice(0, -5).replace(/-/g, ' ');
    return `<li><a href="/recipes/${file}">${dishName}</a></li>`;
  }).join('');

  const indexHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recipe Generator</title>
      <link rel="stylesheet" href="/styles.css">
    </head>
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
        <section class="hero">
          <h2>Generate a Recipe</h2>
          <form id="recipe-form">
            <label for="dish-name">Enter a dish name:</label>
            <input type="text" id="dish-name" name="dish-name" required>
            <button type="submit">Generate Recipe</button>
          </form>
        </section>
        <section class="recent-recipes">
          <h2>Recently Generated Recipes</h2>
          <ul>
            ${recipeList}
          </ul>
        </section>
      </main>
      <footer>
        <p>&copy; 2024 Recipe Generator. All rights reserved.</p>
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
    const dishName = file.slice(0, -5).replace(/-/g, ' ');
    return `
      <li>
        <a href="/recipes/${file}">
          <div class="recipe-item">
            <h3>${dishName}</h3>
            <p>Click to view the recipe</p>
          </div>
        </a>
      </li>
    `;
  }).join('');

  const recipesHtml = `
    <html>
      <head>
        <title>Generated Recipes</title>
        <link rel="stylesheet" href="/styles.css">
      </head>
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
          <p>&copy; 2023 Recipe Generator. All rights reserved.</p>
        </footer>
      </body>
    </html>
  `;

  res.send(recipesHtml);
});



app.get('/generate-recipe', async (req, res) => {
  const dishName = req.query.dish;
  const prompt = `Generate a recipe for ${dishName}. Include the following sections:
  
  - Introduction: Provide a brief introduction to the recipe.
  - Ingredients: List the ingredients required for the recipe.
  - Cooking Time: Specify the cooking time for the recipe.
  - Instructions: Provide step-by-step instructions to make the recipe.

  Format the sections as follows:
  - Use <h2> tags for the main sections (e.g., Ingredients, Cooking Time, Instructions).
  - Use <h3> tags for any subsections within the main sections.
  - Use <strong> tags to make important text or phrases bold.
  - Format ingredients list as a table, with bold headers and borders`;

  try {
    const messages = [
      { role: 'user', content: prompt }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0,
      max_tokens: 1500
    });

    const recipeText = response.choices[0].message.content.trim();

    const recipeHtml = `
      <html>
        <head>
          <title>Recipe for ${dishName}</title>
          <link rel="stylesheet" href="/recipe-styles.css">
        </head>
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
            <h1>Recipe for ${dishName}</h1>
            <div class="recipe-content">
              ${recipeText}
            </div>
            <a href="/">Go Back</a>
          </main>
          <footer>
            <p>&copy; 2023 Recipe Generator. All rights reserved.</p>
          </footer>
        </body>
      </html>
    `;

    const fileName = `${dishName.toLowerCase().replace(/\s+/g, '-')}.html`;
    const filePath = path.join(__dirname, 'public', 'recipes', fileName);

    fs.writeFileSync(filePath, recipeHtml);

    res.redirect(`/recipes/${fileName}`);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    res.status(500).send('An error occurred while generating the recipe.');
  }
});



app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
