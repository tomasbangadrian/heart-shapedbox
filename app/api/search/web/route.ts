import { NextRequest, NextResponse } from 'next/server'

export interface WebSearchResult {
  source: 'recent_web'
  confidence: number
  result: {
    title: string
    link: string
    snippet: string
  }
  rawData: any
  latency: number
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { query } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      )
    }

    // Check if Serper API key is configured
    if (!process.env.SERPER_API_KEY) {
      console.error('❌ SERPER_API_KEY is not set!')
      return NextResponse.json(
        { error: 'Serper API key is not configured' },
        { status: 500 }
      )
    }

    console.log('🔍 Searching web for:', query)

    // Call Serper API
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        num: 5 // Get top 5 results
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Serper API error:', response.status, errorText)
      return NextResponse.json(
        { error: `Serper API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    const latency = Date.now() - startTime

    console.log('✅ Web search completed in', latency, 'ms')
    console.log('📊 Results:', data.organic?.length || 0, 'results')

    // Calculate confidence based on result quality
    const confidence = calculateConfidence(data)

    const result: WebSearchResult = {
      source: 'recent_web',
      confidence,
      result: data.organic && data.organic[0] ? {
        title: data.organic[0].title,
        link: data.organic[0].link,
        snippet: data.organic[0].snippet
      } : {
        title: '',
        link: '',
        snippet: ''
      },
      rawData: data,
      latency
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('❌ Web search error:', error.message)
    return NextResponse.json(
      { error: 'Error performing web search: ' + error.message },
      { status: 500 }
    )
  }
}

// Calculate confidence score based on search result quality
function calculateConfidence(data: any): number {
  if (!data.organic || data.organic.length === 0) {
    return 0
  }

  let confidence = 50 // Base confidence

  // More results = higher confidence
  if (data.organic.length >= 5) confidence += 20
  else if (data.organic.length >= 3) confidence += 10

  // Knowledge graph presence = higher confidence
  if (data.knowledgeGraph) confidence += 15

  // Answer box presence = very high confidence
  if (data.answerBox) confidence += 15

  // Top result has high position = higher confidence
  const topResult = data.organic[0]
  if (topResult.position === 1) confidence += 10

  return Math.min(confidence, 100)
}
