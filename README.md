# ELM Easy Monitoring: pre-launch page

The pre-launch landing page for ELM, stock sync for eBay sellers whose suppliers run on Shopify.

Live page: https://bazzoka.github.io/elm-pre-launch/

A static site served by GitHub Pages:

- **Pricing:** four plans priced by managed eBay variations. There is no checkout; every plan button opens the waitlist.
- **Waitlist:** signups and the chosen plan are stored in Supabase through two public database functions. The page holds only the publishable key; visitors cannot read the list.
- **Contact form:** messages are delivered by Web3Forms. Its access key is public by design and can only send to our inbox.

The page is generated from the marketing project (`tools/build_static_site.py`); edit it there, not here.

eBay is a trademark of eBay Inc. Shopify is a trademark of Shopify Inc. ELM is independent and is not affiliated with or endorsed by eBay or Shopify.
