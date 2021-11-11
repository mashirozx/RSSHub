const got = require('@/utils/got');
const { JSDOM } = require("jsdom");

module.exports = async (ctx) => {
    const url = 'https://windows10spotlight.com/feed';

    const response = await got.get(url);

    const input = response.data.replace(/\n/g, " ").replace(/\s+/g, " ");

    const regex = /<content:encoded><!\[CDATA\[(.*?)\]\]><\/content:encoded>/g;

    let matches, output = [];
    while (matches = regex.exec(input)) {
        output.push(matches[1]);
    }

    const feed = []

    output.forEach(item => {
        const feedItem = {}
        const dom = new JSDOM(item);
        dom.window.document.querySelectorAll("a:not([target])").forEach((a, i) => {
            const href = a.href.replace('https://windows10spotlight.com/wp-content/uploads/','https://s3.mashiro.top/spolight/')
            feedItem[i ? 'portrait' : 'landscape'] = href
        })

        feedItem.title = dom.window.document.querySelector("figcaption").textContent

        feed.push(feedItem)
    })


    ctx.state.data = {
        title: 'Windows 10 Spotlight Images',
        link: 'https://windows10spotlight.com/',
        image: 'https://windows10spotlight.com/wp-content/uploads/2020/01/cropped-spotlight-32x32.png',
        item: feed.map((item) => ({
            title: item.title,
            description: `${item.title}<br><img src="${item.landscape}" /><br><img src="${item.portrait}" />`,
            pubDate: new Date(new Date(item.dateline) - 8 * 60 * 60 * 1000),
            link: item.landscape,
            itunes_item_image: item.picture3, // 每个track单独的图片
            enclosure_url: item.tts, // 音频链接
            enclosure_type: `audio/mpeg`,
        })),
    };
};
