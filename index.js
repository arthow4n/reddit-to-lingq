const express = require('express')
const path = require('path')
const fetch = require('node-fetch')
const { Request, Header } = fetch
const cheerio = require('cheerio')
const PORT = process.env.PORT || 5000

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/lingq', async (req, res) => {
    const redditURL = req.query['reddit']
    if (!redditURL.length) {
      res.status = 400
      res.end('reddit url empty')
    }
    
    const mobileRedditUrl = new URL(redditURL)
    if (!mobileRedditUrl.pathname.endsWith('/')) {
      mobileRedditUrl.pathname = mobileRedditUrl.pathname + '/'
    }
    mobileRedditUrl.pathname = mobileRedditUrl.pathname + '.mobile'
    mobileRedditUrl.searchParams = new URLSearchParams({
      'keep_extension': 'True',
    })

    const redditReq = new Request(String(mobileRedditUrl), {
      headers: {
        "User-Agent" : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36",
      },
    })


    const $ = cheerio.load(
      await (await fetch(redditReq)).text(),
    )

    const title = `${$('title').text()} - reddit.com`

    const result$ = cheerio.load(`
    <html>
    <head>
        <title></title>
    </head>
    <body>
    
    </body>
    </html>
    `
    )

    $(".md").toArray().map(e => $(e).text()).map(text => {
      const p = $('<p></p>')
      p.text(text)
      return p
    }).forEach(p => {
      const body$ = result$('body')
      body$.append(p)
      body$.append($('<p></p><p>===</p><p></p>'))
    })
    
    result$('title').text(title)

    res.set({ 'Content-Type': 'text/html; charset=utf-8' });
    res.end(result$.root().html());
  })
  .get('/', (req, res) => res.render('pages/index'))
  
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
