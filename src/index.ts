import '@logseq/libs'
import { BlockIdentity } from '@logseq/libs/dist/LSPlugin.user'

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
  const cleanedQuery = query.replace('–', '')

  console.log(`logseq-discogs-plugin :: Fetching results for ${cleanedQuery}`)

  if (query) {
    try {
      const res = await fetch(`https://www.honkytonk.in/api/discogs?q=${cleanedQuery}`)
      const release = await handleResponse(res)

      if (!release.title && release.message) {
        return logseq.UI.showMsg('logseq-discogs-plugin :: No results!')
      }

      return addRelease(release, e.uuid)
    } catch (err) {
      console.error('logseq-discogs-plugin :: Error: ', err)

      return logseq.UI.showMsg('logseq-discogs-plugin :: Error! Check for any special characters in your block and remove them, then try again.', 'error')
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
  const mainText = `${artist}, *${title}* ([[${year}]])`

  await logseq.Editor.insertBatchBlock(srcBlock, [
    {
      content: mainText,
      children: [
        {
          content: 'rating:: ',
        },
        {
          content: `record-label:: [[${label}]]`,
        },
        {
          content: `tags:: albums, ${tags.join(', ')}`,
        },
        {
          content: `url:: ${release.url}`,
        },
      ],
    },
  ])

  await logseq.Editor.removeBlock(srcBlock)
}

const main = () => {
  console.log('logseq-discogs-plugin :: Loaded!')

  logseq.Editor.registerBlockContextMenuItem(
    'Query discogs.com API',
    async (e) => {
      await fetchReleaseData(e)
    }
  )
}

logseq.ready(main).catch(console.error)
