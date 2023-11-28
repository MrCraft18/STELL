const OpenAI = require("openai")
const fs = require('fs')


const openai = new OpenAI({
    apiKey: "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",
})

const generateConversation = (record) => {
    return new Promise(async resolve => {
        const messages = [
            {
                'role': 'system',
                'content': conversationPrompt(record)
            }
        ]
    
        record.conversation.forEach(text => {
            if (text.sender === 'STELL') {
                messages.push({
                    'role': 'assistant',
                    'content': text.content
                })
            } else {
                messages.push({
                    'role': 'user',
                    'content': text.content
                })
            }
        })

        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4',
                messages,
                temperature: 0.1,
                max_tokens: 256
            })
        
            resolve(completion.choices[0].message.content)
        } catch (err) {
            console.log(err)

            const completion = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages,
                temperature: 0.1,
                max_tokens: 256
            })
        
            resolve(completion.choices[0].message.content)
        }
    })
}



const generateisQuestion = (record) => {
    return new Promise(async resolve => {
        const messages = [
            {
                'role': 'system',
                'content': isQuestionPrompt(record)
            }
        ]

        let userContent = ''
    
        record.conversation.forEach(text => {
            if (text.sender === 'STELL') {
                userContent += `YOU\n${text.content}\n`
            } else {
                userContent += `${record.name.split(' ')[0]}\n${text.content}\n`
            }
        })

        messages.push({
            'role': 'user',
            'content': userContent
        })

        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages,
                temperature: 0.01,
                max_tokens: 256
            })
        
            resolve(completion.choices[0].message.content)
        } catch (err) {
            console.log(err)

            const completion = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages,
                temperature: 0.1,
                max_tokens: 256
            })
        
            resolve(completion.choices[0].message.content)
        }
    })
}



const generateisColdLead = (record) => {
    return new Promise(async resolve => {
        const messages = [
            {
                'role': 'system',
                'content': isColdLeadPrompt(record)
            }
        ]

        let userContent = ''
    
        record.conversation.forEach(text => {
            if (text.sender === 'STELL') {
                userContent += `YOU\n${text.content}\n`
            } else {
                userContent += `${record.name.split(' ')[0]}\n${text.content}\n`
            }
        })

        messages.push({
            'role': 'user',
            'content': userContent
        })

        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages,
                temperature: 0.01,
                max_tokens: 256
            })
        
            resolve(completion.choices[0].message.content)
        } catch (err) {
            console.log(err)

            const completion = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages,
                temperature: 0.1,
                max_tokens: 256
            })
        
            resolve(completion.choices[0].message.content)
        }
    })
}



const generateisClearAnswer = (record) => {
    return new Promise(async resolve => {
        const messages = [
            {
                'role': 'system',
                'content': isClearAnswerPrompt(record)
            }
        ]

        let userContent = ''
    
        record.conversation.forEach(text => {
            if (text.sender === 'STELL') {
                userContent += `YOU\n${text.content}\n`
            } else {
                userContent += `${record.name.split(' ')[0]}\n${text.content}\n`
            }
        })

        messages.push({
            'role': 'user',
            'content': userContent
        })

        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages,
                temperature: 0.01,
                max_tokens: 256
            })
        
            resolve(completion.choices[0].message.content)
        } catch (err) {
            console.log(err)

            const completion = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages,
                temperature: 0.1,
                max_tokens: 256
            })
        
            resolve(completion.choices[0].message.content)
        }
    })
}



function conversationPrompt(record) {
    if (record.conversationLabel === 'stellConversation') {
        const rawSystemContext = fs.readFileSync('./conversation-prompt.txt', 'utf8')

        const name = record.name.split(' ')[0]
        const address = record.address.split(',')[0].trim()
    
        const systemContext = rawSystemContext
            .replace('[name]', name)
            .replace('[address]', address)
    
        return systemContext
    } else if (record.conversationLabel === 'coldLead') {
        const rawSystemContext = fs.readFileSync('./coldLeadConversation-prompt.txt', 'utf8')

        const name = record.name.split(' ')[0]
        const address = record.address.split(',')[0].trim()
    
        const systemContext = rawSystemContext
            .replace('[name]', name)
            .replace('[address]', address)
    
        return systemContext
    }
}



function isQuestionPrompt(record) {
    const rawSystemContext = fs.readFileSync('./isQuestion-prompt.txt', 'utf8')

    const name = record.name.split(' ')[0]

    const systemContext = rawSystemContext
    .replace('[name]', name)

    return systemContext
}



function isColdLeadPrompt(record) {
    const rawSystemContext = fs.readFileSync('./isColdLead-prompt.txt', 'utf8')

    const name = record.name.split(' ')[0]

    const systemContext = rawSystemContext
    .replace('[name]', name)

    return systemContext
}



function isClearAnswerPrompt(record) {
    const rawSystemContext = fs.readFileSync('./isClearAnswer-prompt.txt', 'utf8')

    const name = record.name.split(' ')[0]

    const systemContext = rawSystemContext
    .replace('[name]', name)

    return systemContext
}













module.exports = {
    generateConversation,
    generateisQuestion,
    generateisColdLead,
    generateisClearAnswer
}