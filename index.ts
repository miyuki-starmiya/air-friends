// Import all dependencies, mostly using destructuring for better view.
import { ClientConfig, Client, middleware, MiddlewareConfig, WebhookEvent, TextMessage, MessageAPIResponseBase } from '@line/bot-sdk'
import { Application, Request, Response } from 'express'
import 'dotenv/config'

const { Configuration, OpenAIApi } = require('openai')
const express = require('express')

// OpenAI setting
const openAIConfig = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(openAIConfig)

// Setup all LINE client and Express configurations.
const clientConfig: ClientConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.CHANNEL_SECRET,
}

const middlewareConfig: MiddlewareConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET || '',
}

const PORT: number | string = process.env.PORT || 3000

// Create a new LINE SDK client.
const client = new Client(clientConfig)

// Create a new Express application.
const app: Application = express()

// Function handler to receive the text.
const textEventHandler = async (event: WebhookEvent): Promise<MessageAPIResponseBase | undefined> => {
  // Process all variables here.
  if (event.type !== 'message' || event.message.type !== 'text') {
    return
  }

  // Process all message related variables here.
  const { replyToken } = event
  const prompt = event.message.text
  const model = 'davinci:ft-personal-2023-02-26-05-07-41'

  // generate response created by OpenAI's model
  const AIResponse = await openai.createCompletion({
    model: model,
    prompt: prompt,
  })
  const text: string = AIResponse.data.choices[0].text

  // Create a new message.
  const response: TextMessage = {
    type: 'text',
    text: text,
  }

  // Reply to the user.
  await client.replyMessage(replyToken, response)
}

// Register the LINE middleware.
// As an alternative, you could also pass the middleware in the route handler, which is what is used here.
// app.use(middleware(middlewareConfig))

// Route handler to receive webhook events.
// This route is used to receive connection tests.
app.get(
  '/',
  async (_: Request, res: Response): Promise<Response> => {
    console.log('Connected successfully!')
    return res.status(200).json({
      status: 'success',
      message: 'Connected successfully!',
    })
  }
)

// This route is used for the Webhook.
app.post(
  '/webhook',
  middleware(middlewareConfig),
  async (req: Request, res: Response): Promise<Response> => {
    const events: WebhookEvent[] = req.body.events

    // Process all of the received events asynchronously.
    const results = await Promise.all(
      events.map(async (event: WebhookEvent) => {
        try {
          await textEventHandler(event)
        } catch (err: unknown) {
          if (err instanceof Error) {
            console.error(err)
          }

          // Return an error message.
          return res.status(500).json({
            status: 'error',
          })
        }
      })
    )

    // Return a successfull message.
    console.log('success')
    return res.status(200).json({
      status: 'success',
      results,
    })
  }
)

// Create a server and listen to it.
app.listen(PORT, () => {
  console.log(`Application is live and listening on port ${PORT}`)
})
