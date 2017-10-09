
// {{PRE_RUN_ADDITIONS}}

/*
console.log(Module)

for (i in Module) {
    if (typeof Module[i] == "number") console.log(i + ": " + Module[i])
    else console.log(i + ": " + typeof Module[i])
    // Find out which of there are globals
}
*/

var env_globals = {}

var trace_calls = false
var trace_calls = true

var recording = true

var calls = []

function makeStub(name, func) {
    console.log("Stub: " + name)
    return function () {
        if (trace_calls) console.log("Calling ", name, arguments)
        startMemoryRecord()
        var res = func.apply(null, arguments)
        if (recording) {
            var obj = {result: res, args:Array.from(arguments), name:name, memory:memory_record}
            console.log(obj)
            outputCall(obj)
        }
        // calls.push({result: res, args:Array.from(arguments), name:name, memory:memory_record})
        if (trace_calls) console.log("Result", res)
        return res
    }
}

for (i in global_info.env) {
    if (typeof global_info.env[i] == "number") {
        console.log(i + ": " + global_info.env[i])
        env_globals[i] = global_info.env[i]
    }
    else {
        // console.log(i + ": " + typeof global_info.env[i])
        if (typeof global_info.env[i] == "function" && i != "getTotalMemory" && i.substr(0,6) != "invoke") global_info.env[i] = makeStub(i, global_info.env[i])
    }
    // Find out which of there are globals
}

// console.log(global_info)

var saved_globals = {
    mem: [].concat.apply([], memory_record.heap32.filter(x => typeof x == "object")),
    env: env_globals,
    total_memory: TOTAL_MEMORY,
}

console.log(JSON.stringify(saved_globals))

console.log(memory_record)

// writing calls

var arr = []

function u8(x) {
    arr.push(x & 0xff)
}

function u16(x) {
    u8(x)
    u8(x >> 8)
}

function u32(x) {
    u16(x)
    u16(x >> 16)
}

function u64(x) {
    u32(x)
    u32(x >> 32)
}

// Only 32 bit heaps, makes things easier (they fit into JS numbers)

var fs = require("fs")

/*
var rs = fs.createWriteStream(source_dir + "/record.bin")

rs.on('finish', () => {
  console.error('All writes are now complete.');
})

rs.on('error', (err) => {
  console.error('sdhsdhsddlsalds', err)
})
*/

var record_file = fs.openSync(source_dir + "/record.bin", "w")

function outputCall(call) {
// number of args, args
// arg might be 64 bit?
    u16(call.args.length)
    call.args.forEach(u64)
// just setting the memory for now
    var h8 = call.memory.heap8.filter(x => typeof x == "object")
    u32(h8.length)
    h8.forEach(x => { u32(x[0]); u8(x[1]) })
    var h16 = call.memory.heap16.filter(x => typeof x == "object")
    u32(h16.length)
    h16.forEach(x => { u32(x[0]); u16(x[1]) })
    var h32 = call.memory.heap32.filter(x => typeof x == "object")
    u32(h32.length)
    h32.forEach(x => { u32(x[0]); u32(x[1]) })
    // rs.write(Buffer.from(arr), function () { console.log("??????????????????????????????????????????????") })
// also number of returns
    if (typeof call.result != "undefined") {
        u16(1)
        u64(call.result)
    }
    else u16(0)
    fs.writeSync(record_file, Buffer.from(arr))
    arr = []
    // console.error("Output")
}

function outputRecord() {
    console.log("Writing record")
    // u32(calls.length)
    // calls.forEach(outputCall)
    
    // rs.end(function () { console.log("???? what") })
    fs.closeSync(record_file)
    recording = false

    // fs.writeFileSync(source_dir + "/record.bin", Buffer.from(arr))
    fs.writeFileSync(source_dir + "/globals.json", JSON.stringify(saved_globals))
}

addOnExit(outputRecord)


