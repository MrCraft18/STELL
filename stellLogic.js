const GPTFunctions = require('./gpt-functions.js')



async function stellLogic(record) {
    switch (record.stage) {
        case 0:
            return await stage0(record)
        
        case 1: 
            return await stage1(record)

        case 2:
            return await stage2(record)

        case 3:
            return await stage3(record)

        default:
            throw new Error('Unknown Funnel Stage')
    }
}

module.exports = {
    stellLogic
}

async function nextStage(record) {
    record.stage++

    return await GPTFunctions.stellResponse(record)
}

function drop(record) {
    record.stage = -1

    return {record, stellResponse: null}
}



async function stage0(record) {
    let response = await GPTFunctions.logic('is_annoyed_frustrated_angry', record)
    if (response.result.answer === 'true') return drop(response.record)

    response = await GPTFunctions.logic('is_unintended_recipient', response.record)
    if (response.result.answer === 'true') return drop(response.record)
    if (response.result.answer === 'false') return await nextStage(response.record)
}



async function stage1(record) {
    let response = await GPTFunctions.logic('is_unintended_recipient', record)
    if (response.result.answer === 'true') return drop(response.record)

    response = await GPTFunctions.logic('is_annoyed_frustrated_angry', response.record)
    if (response.result.answer === 'true') return drop(response.record)

    response = await GPTFunctions.logic('is_asking_price_too_high', response.record)
    if (response.result.answer === 'true') return drop(response.record)

    response = await GPTFunctions.logic('is_already_listed_or_with_realtor', response.record)
    if (response.result.answer === 'true') return drop(response.record)

    response = await GPTFunctions.logic('is_consent_question_asked', response.record)
    if (response.result.answer === 'false') return await GPTFunctions.stellResponse(response.record)

    response = await GPTFunctions.logic('is_consent_given', response.record)
    if (response.result.answer === 'false') return drop(response.record)
    if (response.result.answer === 'continue') return await GPTFunctions.stellResponse(response.record)
    if (response.result.answer === 'true') return await nextStage(response.record)
}



async function stage2(record) {
    let response = await GPTFunctions.logic('is_asking_price_too_high', record)
    if (response.result.answer === 'true') return drop(response.record)

    response = await GPTFunctions.logic('is_already_listed_or_with_realtor', response.record)
    if (response.result.answer === 'true') return drop(response.record)

    response = await GPTFunctions.logic('is_property_questions_answered', response.record)
    if (response.result.answer === 'false') return await GPTFunctions.stellResponse(response.record)

    response.record.stage = 3

    response = await GPTFunctions.logic('is_asking_already_stated', response.record)
    if (response.result.answer === 'true')  {
        const stellResponse = "Ok thanks for the info. Once I run my numbers can I come back with an offer for the property?"

        response.record.textConversation.push({
            sender: 'STELL',
            content: stellResponse,
            timestamp: new Date().toLocaleString()
        })

        response.record.gptMessages.push({
            role: 'assistant',
            content: stellResponse,
        })

        return {record: response.record, stellResponse}
    }


    if (response.result.answer === 'false') {
        const stellResponse = "Ok thanks for the info. While I run my numbers do you have an ideal price you'd want for the property?"

        response.record.textConversation.push({
            sender: 'STELL',
            content: stellResponse,
            timestamp: new Date()
        })

        response.record.gptMessages.push({
            role: 'assistant',
            content: stellResponse,
        })

        return {record: response.record, stellResponse}
    }
}



async function stage3(record) {
    let response = await GPTFunctions.logic('is_asking_price_too_high', record)
    if (response.result.answer === 'true') return drop(response.record)

    record.stage = 'lead'

    return {record, stellResponse: null}
}