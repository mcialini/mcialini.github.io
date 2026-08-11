# Food Tracker

Food Tracker is a multi-purpose application for documenting food that you eat and cook.

The goal here isn't calorie-counting or strict recipe creation. It's more about holistically tracking the foods you eat and getting insights about your overall diet and your nutritional balance.

Additionally, if you are interested in preparing more meals at home, it can track which meals you cooked yourself, the recipe page you started from, any notes on that recipe you want to save.

The interface is meant to be as low-friction as possible to remove any excuse to not track.

## Requirements

- To start, the food tracker app will have a single page, which will be a feed displaying all entries by day from newest to oldest
- Within a day, entries should be sorted by date added (oldest first), as if it was breakfast first
- Entries in a day do not need to be labeled as breakfast, lunch, dinner, snack, etc.
- When entering a food item, it should immediately offer suggestions for auto-complete based on prefix match to entries in your history. More frequent occurences should be suggested higher in the dropdown