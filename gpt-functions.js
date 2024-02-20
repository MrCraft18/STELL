const fs = require('fs')
const OpenAI = require('openai')
require('dotenv').config()

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})


const FUNCTIONS_PATH = './gpt-logic-functions/functions'
const LOGIC_PROMPTS_PATH = './gpt-logic-functions/prompts'


const tools = fs.readdirSync(FUNCTIONS_PATH).map(file => JSON.parse(fs.readFileSync(`${FUNCTIONS_PATH}/${file}`, 'utf-8')))


const UNIVERSAL_LOGIC_SYSTEM_PROMPT = 'You the assistant are a cold messenging wholesaler and the user is a potential property seller. And in your response you must refer to yourself, the cold messenger, in first person.'



async function stellResponse(record) {
    const messages = [
        {
            role: 'system',
            content: fs.readFileSync('./gpt-response-prompts/stage' + record.stage + '-prompt.txt', 'utf-8').replaceAll('[name]', record.name).replaceAll('[address]', record.address)
        },
        ...record.gptMessages
    ]

    completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        tools,
        tool_choice: 'none',
        temperature: 0.1
    })

    record.gptMessages.push(completion.choices[0].message)

    record.textConversation.push({
        sender: 'STELL',
        content: completion.choices[0].message.content,
        timestamp: new Date()
    })

    return {record, stellResponse: completion.choices[0].message.content}
}



async function logic(logicFunctionName, record) {
    const questionCompletion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: record.gptMessages,
        tools,
        tool_choice: {
            type: 'function',
            function: {
                name: logicFunctionName
            }
        }
    })

    const toolCallID = questionCompletion.choices[0].message.tool_calls[0].id

    const answerCompletion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
            {
                role: 'system',
                content: UNIVERSAL_LOGIC_SYSTEM_PROMPT + '\n\n' + fs.readFileSync(`${LOGIC_PROMPTS_PATH}/${logicFunctionName}-prompt.txt`, 'utf-8').replaceAll('[name]', record.name)
            },
            ...record.gptMessages
        ],
        tools,
        tool_choice: 'none',
        temperature: 0,
        response_format: {
            type: 'json_object'
        }
    })

    const result = JSON.parse(answerCompletion.choices[0].message.content)

    record.gptMessages.push(questionCompletion.choices[0].message)

    record.gptMessages.push({
        role: 'tool',
        content: answerCompletion.choices[0].message.content,
        tool_call_id: toolCallID
    })

    return {record, result}
}



module.exports = {
    stellResponse,
    logic,
}