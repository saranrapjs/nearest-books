# Nearest book right now

This is a tool I made to figure out which book, of books you're interested in reading from the Brooklyn Public Library, is available RIGHT NOW — and further, of these available books, which ones are nearest to you.  

It uses a Custom Google Search for adding books to your "queue" — I really wish it didn't, but there is no publicly accessible API for the Brooklyn Public Library's full catalog and I truly did not want to setup a backend just to proxy a cURL scrape of a library search page :(  

However, it *is* able to use a cross-domain-enabled ajax endpoint that BPL has available for determining book availability at various branches.

## Data

- `branches.json` is the main data file, which includes a list of library branches cross-referenced with their hours
- `libraries.json` is a list of branches that I scraped in a past project
- `hours.json` is a separate list of libraries' hours.  I honestly can't remember why there are three of these things.