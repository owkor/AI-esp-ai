/*
 * MIT License
 *
 * Copyright (c) 2025-至今 小明IO
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @author 小明IO
 * @email  1746809408@qq.com
 * @github https://github.com/wangzongming/esp-ai
 * @websit https://espai.fun
 */
const WebSocket = require('ws')
const getServerURL = require("../../getServerURL");

/**
 * TTS 插件封装 - 讯飞 TTS
 * @param {String}      device_id           设备ID
 * @param {String}      text                待播报的文本
 * @param {Object}      tts_config          用户配置的 apikey 等信息
 * @param {String}      iat_server          用户配置的 iat 服务
 * @param {String}      llm_server          用户配置的 llm 服务
 * @param {String}      tts_server          用户配置的 tts 服务
 * @param {Number}      devLog              日志输出等级，为0时不应该输出任何日志
 * @param {Function}    tts_params_set      用户自定义传输给 TTS 服务的参数，eg: tts_params_set(参数体)
 * @param {Function}    connectServerBeforeCb 连接 tts 服务逻辑开始前需要调用这个方法告诉框架：eg: connectServerBeforeCb()
 * @param {Function}    connectServerCb     连接 tts 服务后需要调用这个方法告诉框架：eg: connectServerCb(true)
 * @param {Function}    logWSServer         将 ws 服务回传给框架，如果不是ws服务可以这么写: logWSServer({ close: ()=> {  中断逻辑...  } })
 * @param {Function}    ttsServerErrorCb    与 TTS 服务之间发生错误时调用，并且传入错误说明，eg: ttsServerErrorCb("意外错误")
 * @param {Function}    cb                  TTS 服务返回音频数据时调用，eg: cb({ audio: 音频base64, ... })
 * @param {Function}    log                 为保证日志输出的一致性，请使用 log 对象进行日志输出，eg: log.error("错误信息")、log.info("普通信息")、log.tts_info("tts 专属信息")
*/
function TTS_FN({ text, devLog, tts_config, iat_server, llm_server, tts_server, logWSServer, tts_params_set, cb, log, ttsServerErrorCb, connectServerCb, connectServerBeforeCb }) {
    try {
        const { appid, apiSecret, apiKey, ...other_config } = tts_config;
        if (!apiKey) return log.error(`请配给 TTS 配置 apiKey 参数。`)
        if (!apiSecret) return log.error(`请配给 TTS 配置 apiSecret 参数。`)
        if (!appid) return log.error(`请配给 TTS 配置 appid 参数。`)
        connectServerBeforeCb();
        const ws = new WebSocket(getServerURL("TTS", { appid, apiSecret, apiKey, iat_server, llm_server, tts_server, })); 
        // 如果 ws 服务是个 WebSocket 对象，请调用这个方法。框架在适合的时候会调用 .close() 方法
        logWSServer(ws)

        // 连接建立完毕，读取数据进行识别
        ws.on('open', () => {
            connectServerCb(true); 
            send()
        })

        ws.on('message', (data, err) => {
            if (err) {
                log.tts_info('tts message error: ' + err)
                return
            }

            let res = JSON.parse(data)

            if (res.code != 0) {
                ttsServerErrorCb(`讯飞tts接口错误 ${res.code}: ${res.message}`)
                connectServerCb(false);
                ws.close()
                return
            }

            const audio = res.data.audio;
            if (!audio) {
                // 这种情况算结束
                cb({ is_over: true, audio: "", ws: ws });
                connectServerCb(false);
                return
            }
            let audioBuf = Buffer.from(audio, 'base64');
            cb({
                // 根据服务控制
                is_over: res.code === 0 && res.data.status === 2,
                audio: audioBuf,
                ws: ws
            });

        })

        // 资源释放, 某些服务需要在这里面调用一次 cb({ is_over: true })
        ws.on('close', () => {
            connectServerCb(false);
        })

        // 连接错误
        ws.on('error', (err) => {
            ttsServerErrorCb(`tts错误："websocket connect err: ${err}`)
            connectServerCb(false);
        })
        // 传输数据
        function send() {
            const business = {
                volume: 100,
                "vcn": "aisbabyxu",
                ...other_config,
                aue: "lame",
                sfl: 1,
                "auf": "audio/L16;rate=16000",
                "tte": "UTF8",
            }
            const frame = {
                // 填充common
                "common": {
                    "app_id": appid
                },
                // 填充business
                "business": tts_params_set ? tts_params_set(business) : business,
                // 填充data
                "data": {
                    "text": Buffer.from(text).toString('base64'),
                    "status": 2
                }
            }
            ws && ws.send(JSON.stringify(frame))
        }
    } catch (err) {
        connectServerCb(false);
        log.error(`讯飞 TTS 错误： ${err}`)
    }
}

module.exports = TTS_FN;
