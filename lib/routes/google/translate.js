const cheerio = require('cheerio');
const sha1 = require('sha1');

/*
 * Docs: /google/translate/:to/:sha:/:type/:sl?/:domain?/?text
 * :sha used as route cache
 * :type param type defalt 0
 * 0: ?source content
 * 1: ?text=uri encoded source content
 */
module.exports = async (ctx) => {
  const type = ctx.params.type || 0 === "1";
  const query = type ? decodeURIComponent(ctx.query.text) : decodeURIComponent(ctx.querystring);
  const text = encodeURIComponent(query);
  const sha = sha1(query);
  const route = ctx.params.sha;
  const to = ctx.params.to;
  const sl = ctx.params.sl || "auto";
  const domain = ctx.params.domain || "com";

  const link = `https://translate.google.${domain}/?ui=tob&sl=${sl}&tl=${to}&text=${text}&op=translate`;

  const html = await ctx.cache.tryGet(link, async () => {

    const browser = await require('@/utils/puppeteer')();
    const page = await browser.newPage();

    await page.goto(link);

    const body = await page.evaluate(() =>
      document.querySelector('body').innerHTML
    );

    browser.close();

    return body;
  });

  const $ = cheerio.load(html);
  const inputValue = $('textarea').eq(0).text().trim();
  const translationVaule = $('[data-language-for-alternatives]').find('span').map((index, element) => {
      if (index % 2 === 0) return $(element).text();
    })
    .get()
    .join('')
  const pronunciationValue = $('[data-location=2] div').first().text();

  ctx.state.data = {
    title: 'Google Translate API',
    link,
    description: 'Google Translate API',
    language: to,
    item: [{
        title: 'translation',
        description: translationVaule,
        author: sha,
      },
      {
        title: 'pronunciation',
        description: pronunciationValue,
        author: sha,
      },
      {
        title: 'source',
        description: inputValue,
        author: sha,
      },
      {
        title: 'query',
        description: query,
        author: route,
      },
      // {
      //   title: 'debug',
      //   description: html,
      //   author: route,
      // }
    ],
  };
};