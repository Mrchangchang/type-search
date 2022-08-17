const { Notification } = require('electron')
const searchParams = new URLSearchParams({
  'x-algolia-agent': 'TS DT Fetch',
  'x-algolia-application-id': 'OFCNCOG2CU',
  'x-algolia-api-key': 'f54e21fa3a2a0160595bb058179bfb1e',
})
const href = `https://ofcncog2cu-2.algolianet.com/1/indexes/*/queries?${searchParams.toString()}`
const abort = new AbortController()

const cache = new Map()
const randomQuery = [
  'react',
  'express',
  'lodash',
  'preact',
  'lambda',
  'jest',
  'danger',
  'ember',
  'vue',
  'svelte',
  'node',
  'ASP',
]
const createPostData = (requestedSearch) => {
  const search =
    requestedSearch ||
    randomQuery[Math.floor(Math.random() * randomQuery.length)]
  return {
    requests: [
      {
        analyticsTags: ['typescriptlang.org/dt/search'],
        attributesToHighlight: ['name', 'description', 'keywords'],
        attributesToRetrieve: [
          'deprecated',
          'description',
          'downloadsLast30Days',
          'homepage',
          'humanDownloadsLast30Days',
          'keywords',
          'license',
          'modified',
          'name',
          'owner',
          'repository',
          'types',
          'version',
        ],
        facets: ['keywords', 'keywords', 'owner.name'],
        hitsPerPage: requestedSearch ? 51 : 25,
        indexName: 'npm-search',
        maxValuesPerFacet: 10,
        page: 0,
        params: '',
        query: search.startsWith('@types/')
          ? search.substring('@types/'.length)
          : search,
        tagFilters: '',
      },
    ],
  }
}
const Installers = {
  npm: ['npm i', '--save-dev'],
  yarn: ['yarn add', '--dev'],
  pnpm: ['pnpm add', '--save-dev'],
}
const getResultList = (list = []) => {
  const installer = Installers.yarn
  return list.map((v) => {
    const { name, description, types = {} } = v
    const npmUrl = `https://www.npmjs.com/package/${name}`
    const installCommands = [`${installer[0]} ${name}`]
    if (types.ts === 'definitely-typed') {
      installCommands.push(
        `${installer[0]} ${types.definitelyTyped} ${installer[1]}`
      )
    }
    return {
      title: name,
      description: `${description}\n（选择复制：${installCommands.join(
        ' && '
      )}）`,
      icon: 'https://files.catbox.moe/tur943.png',
      url: npmUrl,
      installCommands: installCommands.join(' && '),
    }
  })
}

window.exports = {
  type: {
    mode: 'list',
    args: {
      // 进入插件时调用（可选）
      enter: (action, callbackSetList) => {
        // 如果进入插件就要显示列表数据
        callbackSetList([
          {
            title: 'Type Search',
            description: '搜索npm包类型',
            icon: '', // 图标(可选)
            url: 'https://www.typescriptlang.org/dt/search?search=',
          },
        ])
      },
      // 子输入框内容变化时被调用 可选 (未设置则无搜索)
      search: (action, searchWord, callbackSetList) => {
        // 获取一些数据
        const cached = cache.get(searchWord)
        if (cached) {
          // 执行 callbackSetList 显示出来
          callbackSetList(getResultList(cached.hits))
          return
        }
        abort.abort()
        fetch(href, {
          method: 'POST',
          body: JSON.stringify(createPostData(searchWord)),
        }).then(async (response) => {
          const json = await response.json()
          const [rawResult] = json.results
          const processedResult = {
            ...rawResult,
            hits: rawResult.hits.filter((hit) => hit.types.ts),
          }
          cache.set(searchWord, processedResult)
          // 执行 callbackSetList 显示出来
          callbackSetList(getResultList(processedResult.hits))
        })
      },
      // 用户选择列表中某个条目时被调用
      select: (action, itemData, callbackSetList) => {
        window.utools.hideMainWindow()
        const installCommands = itemData.installCommands
        const url = itemData.url
        if (installCommands) {
          /** 复制命令 */
          utools.copyText(installCommands)
          /** 通知 */
          utools.showNotification('复制成功')
        } else {
          utools.shellOpenExternal(url)
        }
        window.utools.outPlugin()
      },
      placeholder: 'Type Search',
    },
  },
}
