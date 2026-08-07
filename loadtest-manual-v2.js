const autocannon = require('autocannon')
const readline = require('readline')
const fs = require('fs')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (q) => new Promise(resolve => rl.question(q, resolve))

async function main() {
    console.log('\x1b[36m=== AUTOCANNON V2 - DENGAN STATUS BREAKDOWN ===\x1b[0m\n')

    const target = await question('Target URL: ')
    const method = await question('Method [GET]: ') || 'GET'
    let body = await question('Body JSON [kosongkan jika GET]: ')

    const duration = await question('Durasi detik [30]: ') || 30
    const connections = await question('Jumlah Koneksi [20]: ') || 20
    const rps = await question('Pipelining/RPS per koneksi [10]: ') || 10
    const saveCSV = await question('Simpan ke CSV? y/n [n]: ') || 'n'

    rl.close()

    let payload = undefined
    let headers = {}
    if (body.trim()!== '') {
        try {
            JSON.parse(body)
            payload = body
            headers['content-type'] = 'application/json'
        } catch {
            payload = body
        }
    }

    console.log(`\n\x1b[32mMulai test ke: ${target}\x1b[0m`)
    console.log(`Method: ${method} | Koneksi: ${connections} | Durasi: ${duration}s | Pipelining: ${rps}\n`)

    const instance = autocannon({
        url: target,
        method: method.toUpperCase(),
        body: payload,
        headers: headers,
        connections: parseInt(connections),
        duration: parseInt(duration),
        pipelining: parseInt(rps),
        timeout: 10
    })

    let statusCodes = {}

    instance.on('response', (client, statusCode) => {
        statusCodes[statusCode] = (statusCodes[statusCode] || 0) + 1
    })

    autocannon.track(instance, {
        renderProgressBar: true,
        renderResultsTable: true
    })

    instance.on('done', (result) => {
        console.log('\n\x1b[32m=== HASIL AKHIR ===\x1b[0m')
        console.log(`Target: ${result.url}`)
        console.log(`Total Requests: ${result.requests.total}`)
        console.log(`RPS Avg: ${result.requests.average}`)
        console.log(`Latency Avg: ${result.latency.average.toFixed(2)} ms`)
        console.log(`Throughput: ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/s`)
        console.log(`Errors: ${result.errors} Timeouts: ${result.timeouts}`)

        console.log('\n\x1b[33m=== BREAKDOWN STATUS CODE ===\x1b[0m')
        Object.keys(statusCodes).sort().forEach(code => {
            console.log(` ${code}: ${statusCodes[code]}`)
        })

        if (saveCSV.toLowerCase() === 'y') {
            const csv = `stat,value\n` +
                `Total Requests,${result.requests.total}\n` +
                `RPS Avg,${result.requests.average}\n` +
                `Latency Avg,${result.latency.average}\n` +
                `Errors,${result.errors}\n` +
                `Timeouts,${result.timeouts}\n` +
                Object.keys(statusCodes).map(k => `${k},${statusCodes[k]}`).join('\n')

            fs.writeFileSync('hasil-loadtest.csv', csv)
            console.log('\n\x1b[32mHasil disimpan ke: hasil-loadtest.csv\x1b[0m')
        }
    })

    instance.on('error', err => console.error(err))
}

main()
