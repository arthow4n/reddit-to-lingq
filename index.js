const express = require('express')
const path = require('path')
const fetch = require('node-fetch')
const { Request, Header } = fetch
const cheerio = require('cheerio')
const iconv = require('iconv-lite')
const PORT = process.env.PORT || 5000

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/lingq', async (req, res) => {
    const link = req.query['link']
    
    res.set({ 'Content-Type': 'text/html; charset=utf-8' });

    const linkURL = new URL(link);
    switch (true) {
      case linkURL.hostname.endsWith('reddit.com'):
        res.end(await fromReddit(linkURL))
        return
      case linkURL.hostname.endsWith('flashback.org'):
        res.end(await fromFlashback(linkURL))
        return
      default:
        res.status = 400
        res.end(`Unsupported link: ${link}`)
        return
    }
  })
  .get('/manifest.json', (req, res) => res.json(
    {
      "name": "To LingQ Importable",
      "short_name": "LQImport",
      "start_url": "/",
      "display": "minimal-ui",
      "share_target": {
        "action": "/lingq",
        "method": "GET",
        "params": {
          "title": "share_title",
          "text": "link",
          "url": "share_url"
        }
      },
      "icons": [{
        "src": "https://placehold.co/512x512/000000/FFFFFF/png?text=QIm",
        "type": "image/png",
        "sizes": "512x512",
        "purpose": "any",
      }],
      "theme_color": "#111111",
      "background_color": "#000000"
    }
  ))
  .get('/sw.js', (req, res) => {
    res.set({ 'Content-Type': 'application/javascript; charset=utf-8' });
    res.end(
`
self.addEventListener('fetch', event => {
  event.respondWith((async () => {
    try {
      return await fetch(event.request);
    } catch (e) {
      return new Response('Get online, please! You are offline now', {status: 200});
    }
  })());
});
`
    );
  })
  .get('/', (req, res) => res.render('pages/index'))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))


async function fromReddit(redditURL) {
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
  const body$ = result$('body')

  $(".md").toArray().map(e => $(e).text()).map(text => {
    const p = $('<p></p>')
    p.text(text)
    return p
  }).forEach(p => {
    body$.append(p)
    body$.append($('<p></p><p>===</p><p></p>'))
  })
  
  result$('title').text(title)

  return result$.root().html();
}

async function fromFlashback(flashbackURL) {
  const req = new Request(String(flashbackURL), {
    headers: {
      "User-Agent" : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36",
    },
  })


  const $ = cheerio.load(
    iconv.decode(await (await fetch(req)).buffer(), 'ISO-8859-1')
  )

  
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
  const body$ = result$('body')
  
  const title = `${$('title').text()}`
  const titleP = $('<p></p>')
  titleP.text(title)
  body$.append(titleP)

  $('.post_message')
    .toArray()
    .map(messageNode => {
      const quoteText = $(messageNode).find('.post-bbcode-quote-wrapper').text()
      $(messageNode).find('.post-bbcode-quote-wrapper').remove()

      const result = [];
      if (quoteText) {
        const quoteP = $('<p></p>')
        quoteP.text(quoteText)

        result.push($('<p>&gt;&gt;&gt;&gt;&gt;&gt;</p>'))
        result.push(quoteP)
        result.push($('<p>&lt;&lt;&lt;&lt;&lt;&lt;</p>'))
        result.push($('<p></p>'))
      }

      const messageP = $('<p></p>')
      messageP.text($(messageNode).text())
      result.push(messageP)

      result.push($('<p></p>'))
      result.push($('<p>===</p>'))
      result.push($('<p></p>'))

      return result
    })
    .flat()
    .forEach(n => {
      body$.append(n)
    })
  
  result$('title').text(title)

  return result$.root().html();
}