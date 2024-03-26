document.getElementById('recipe-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const dishName = document.getElementById('dish-name').value;
  window.location.href = `/generate-recipe?dish=${encodeURIComponent(dishName)}`;
});