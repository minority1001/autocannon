const autocannon = require('autocannon')
const readline = require('readline')
const fs = require('fs')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (q) => new Promise(resolve => rl.question(q, resolve))

async function main() {
    console.log('\x1b[36m=====================================\x1b[0m')
    console.log('\x1b[36m AUTOCANNON V5 - ANTI CRASH EDITION\x1b[0m')
    console.log('\x1b[36m=====================================\x1b[0m\n')

    const target = await question('Target URL: ')
    const method = await question('Method [GET]: ') || 'GET'
    let body = await question('Body JSON [kosongkan jika GET]: ')
    let headerInput = await question('Header custom? format: key:val,key2:val2 [kosongkan]: ')

    const duration = await question('Durasi detik [10]: ') || 10
    const connections = await question('Jumlah Koneksi [10]: ') || 10
    const rps = await question('Pipelining/RPS per koneksi [1]: ') || 1
    const saveCSV = await question('Simpan ke CSV? y/n [n]: ') || 'n'

    rl.close()

    // Parse Body
    let payload = undefined
    let headers = {}
    if (body.trim()!== '') {
        try {
            JSON.parse(body)
            payload = body
            headers['content-type'] = 'application/json'
        } catch {
            payload = body
            headers['content-type'] = 'text/plain'
        }
    }

    // Parse Header Custom
    if(headerInput.trim()!== ''){
        headerInput.split(',').forEach(h => {
            const [k,v] = h.split(':')
            if(k && v) headers[k.trim()] = v.trim()
        })
    }

    console.log(`\n\x1b[32mMulai test ke: ${target}\x1b[0m`)
    console.log(`Method: ${method.toUpperCase()} | Koneksi: ${connections} | Durasi: ${duration}s | Pipelining: ${rps}`)
    if(Object.keys(headers).length > 0) console.log(`Headers:`, headers)
    console.log('')

    const statusCodes = {}
    const errorTypes = {}

    const instance = autocannon({
        url: target,
        method: method.toUpperCase(),
        body: payload,
        headers: headers,
        connections: parseInt(connections),
        duration: parseInt(duration),
        pipelining: parseInt(rps),
        timeout: 60, // 60 detik biar ga minus
        ignoreErrors: true // lanjut walau 5xx
    })

    // Tangkap status code
    instance.on('response', (client, statusCode) => {
        statusCodes[statusCode] = (statusCodes[statusCode] || 0) + 1
    })

    // Tangkap error tapi jangan crash
    instance.on('error', (err) => {
        errorTypes[err.code || err.message] = (errorTypes[err.code || err.message] || 0) + 1
    })

    instance.on('timeout', () => {
        // diem aja biar ga spam warning
    })

    autocannon.track(instance, {
        renderProgressBar: true,
        renderResultsTable: true
    })

    instance.on('done', (result) => {
        console.log('\n\x1b[32m========== HASIL AKHIR ==========\x1b[0m')
        console.log(`Target : ${result.url}`)
        console.log(`Total Req : ${result.requests.total}`)
        console.log(`RPS Avg : ${result.requests.average}`)
        console.log(`Latency Avg : ${result.latency.average.toFixed(2)} ms`)
        console.log(`Throughput : ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/s`)
        console.log(`2xx Success : ${result['2xx']}`)
        console.log(`4xx Client : ${result['4xx']}`)
        console.log(`5xx Server : ${result['5xx']}`)
        console.log(`Errors : ${result.errors}`)
        console.log(`Timeouts : ${result.timeouts}`)

        console.log('\n\x1b[33m========== BREAKDOWN STATUS ==========\x1b[0m')
        Object.keys(statusCodes).sort().forEach(code => {
            console.log(` ${code}: ${statusCodes[code]}`)
        })

        if(Object.keys(errorTypes).length > 0){
            console.log('\n\x1b[31m========== ERROR TYPE ==========\x1b[0m')
            Object.keys(errorTypes).forEach(e => console.log(` ${e}: ${errorTypes[e]}`))
        }

        if (saveCSV.toLowerCase() === 'y') {
            let csv = `Metric,Value\n`
            csv += `Total Requests,${result.requests.total}\n`
            csv += `RPS Avg,${result.requests.average}\n`
            csv += `Latency Avg,${result.latency.average}\n`
            csv += `2xx,${result['2xx']}\n4xx,${result['4xx']}\n5xx,${result['5xx']}\n`
            Object.keys(statusCodes).forEach(k => csv += `Status ${k},${statusCodes[k]}\n`)

            fs.writeFileSync('hasil-loadtest.csv', csv)
            console.log('\n\x1b[32mHasil tersimpan: hasil-loadtest.csv\x1b[0m')
        }

        console.log('\n\x1b[36m========== SELESAI ==========\x1b[0m')
    })
}

main()
