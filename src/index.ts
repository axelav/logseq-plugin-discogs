import '@logseq/libs'
import {
  BlockIdentity,
  SettingSchemaDesc,
} from '@logseq/libs/dist/LSPlugin.user'

let settings: SettingSchemaDesc[] = [
  {
    key: 'includeEmptyBlock',
    type: 'boolean',
    title: 'Include an empty block in output?',
    description: 'Useful for notes, `rating::` properties, etc.',
    default: true,
  },

  {
    key: 'includeRecordLabel',
    type: 'boolean',
    title: 'Include a `record-label::` property in output?',
    description: 'Inserts a page link to the record label of the release.',
    default: true,
  },
  {
    key: 'includeTags',
    type: 'boolean',
    title: 'Include a `tags::` property in output?',
    description:
      'Inserts a list of "styles" and "genres" data from discogs.com.',
    default: true,
  },
  {
    key: 'includeUrl',
    type: 'boolean',
    title: 'Include a `url::` property in output?',
    description: 'Inserts a URL to the release on discogs.com.',
    default: true,
  },
]

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const text = await res.text()

    return Promise.reject(text)
  } else {
    return await res.json()
  }
}

const fetchReleaseData = async (e: { uuid: string }) => {
  const query = (await logseq.Editor.getBlock(e.uuid))?.content.split('\n')[0]
  const cleanedQuery = query?.replace('–', '')

  console.log(`logseq-discogs-plugin :: Fetching results for ${cleanedQuery}`)

  if (cleanedQuery) {
    try {
      const res = await fetch(
        `https://api.val.town/eval/@axelav.discogs?q=${cleanedQuery}`
      )
      const { data } = await handleResponse(res)

      if (!data.title) {
        return logseq.UI.showMsg('logseq-discogs-plugin :: No results!')
      }

      return addRelease(data, e.uuid)
    } catch (err) {
      console.error('logseq-discogs-plugin :: Error: ', err)

      return logseq.UI.showMsg(
        'logseq-discogs-plugin :: Error! Check for any special characters in your block and remove them, then try again.',
        'error'
      )
    }
  }
}

interface Release {
  artist: string
  title: string
  year: number
  tags: string[]
  label: string
  url: string
}

const addRelease = async (release: Release, srcBlock: BlockIdentity) => {
  const { artist, title, year, tags, label } = release

  const children: { content: string }[] = []

  if (logseq.settings?.includeEmptyBlock) {
    children.push({
      content: '',
    })
  }

  if (logseq.settings?.includeRecordLabel) {
    children.push({
      content: `record-label:: [[${label}]]`,
    })
  }

  if (logseq.settings?.includeTags) {
    children.push({
      content: `tags:: albums, ${tags
        .map((t) => (t.indexOf(',') !== -1 ? `[[${t}]]` : t))
        .join(', ')}`,
    })
  }

  if (logseq.settings?.includeUrl) {
    children.push({
      content: `url:: ${release.url}`,
    })
  }

  await logseq.Editor.insertBatchBlock(srcBlock, [
    {
      content: `${artist}, *${title}* ([[${year}]])`,
      children,
    },
  ])

  await logseq.Editor.removeBlock(srcBlock)
}

const main = () => {
  console.log('logseq-discogs-plugin :: Loaded!')

  logseq.useSettingsSchema(settings)

  logseq.Editor.registerBlockContextMenuItem(
    'Query discogs.com API',
    async (e) => {
      await fetchReleaseData(e)
    }
  )
}

logseq.ready(main).catch(console.error)
