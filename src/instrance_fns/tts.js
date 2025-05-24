/**
 * Copyright (c) 2024 小明IO
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Commercial use of this software requires prior written authorization from the Licensor.
 * 请注意：将 ESP-AI 代码用于商业用途需要事先获得许可方的授权。
 * 删除与修改版权属于侵权行为，请尊重作者版权，避免产生不必要的纠纷。
 * 
 * @author 小明IO   
 * @email  1746809408@qq.com
 * @github https://github.com/wangzongming/esp-ai
 * @websit https://espai.fun
 */

const log = require("../utils/log");

/**
 * 让客户端输出一段话
 */
async function tts(device_id, text, opts) {
    try {
        !device_id && log.error(`调用 tts 方法时，请传入 device_id`);
        if (!G_devices.get(device_id)) return;
        const TTS_FN = require(`../functions/tts`);
        text && await TTS_FN(device_id, {
            text: text,
            pauseInputAudio: true,
            text_is_over: true,
            need_record: false,
            // 给 session_id 客户端可能播放不了
            // 这里后期需要给，否则客户端调用 .tts 无法拿到进度
            // session_id: "0010",
            ...opts
        })
        // 这里不应发送这个标志。
        // ws && ws.send("session_end");
        return true;
    } catch (err) {
        console.log(err);
        log.error(`play_audio_ws_conntceed 消息错误： ${err}`)
        return false;
    }
}

module.exports = tts;