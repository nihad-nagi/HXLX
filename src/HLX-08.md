# XSPX 08
  ## Scope: ## Hx⁰⁸ Broadway Framebuffer Multiplier
> The Vivid driver is designed to emulate HDMI outputs virtually and does not require a physical HDMI port. It creates software-based video output devices that behave like real hardware, allowing you to test applications without needing physical display equipment
### What the Vivid Driver Emulates
> The Vivid driver can emulate a full video output device with HDMI outputs in software. Key capabilities include:

> Virtual HDMI Outputs: You can configure an instance of the driver to have multiple video outputs, each defined as an HDMI output type.

> Software-Based Sink: These emulated outputs act as sinks for video data. Your applications can send video streams to these virtual devices as if they were physical displays.

  > Configurable Resolutions: The driver can emulate a wide range of resolutions, including up to 4K.

> Standard Streaming I/O: It supports standard V4L2 streaming methods like write(), MMAP, USERPTR, and DMABUF for output

### ⚙️ How to Configure Virtual HDMI Outputs
You configure the driver's behavior when loading the kernel module vivid.ko. Key options for HDMI output include:

    > node_types: This bitmask option specifies which devices an instance will create. To create a Video Output node, you need to set bit 8.
  
    > output_types: This option defines the type for each output. For an output to be an HDMI output, you need to set its corresponding bit to 1.

    > num_outputs: Specifies how many outputs to create for a video output device (up to 16).

For example, to create a driver instance with just a video output device that has 2 HDMI outputs, you could use module parameters similar to
```bash
# Example - parameters may need adjustment
sudo modprobe vivid node_types=0x100 num_outputs=2 output_types=0x03
```
> The driver provides many other options for fine-tuning, including crop/compose/scale capabilities and memory allocator selection

```bash
# INPUT: Module parameters defining pipeline
sudo modprobe vivid node_types=0x101 num_inputs=1 num_outputs=1 input_types=0x02 output_types=0x02

# PROCESS: Vivid creates...
# 1. Virtual HDMI source (/dev/video0)
# 2. Virtual HDMI sink (/dev/video1)
# 3. Internal frame buffer connection

# OUTPUT: Applications can now...
v4l2-ctl -d /dev/video0 --set-fmt-video=width=1920,height=1080
v4l2-ctl -d /dev/video1 --set-fmt-video=width=1920,height=1080

# Complete the virtual pipeline
ffmpeg -f v4l2 -i /dev/video0 -f v4l2 /dev/video1
```

```mermaid
classDiagram
  class VividKernelModule {
    +String module_name
    +int major_version
    +int minor_version
    +bool debug_enabled
    +load_with_params()
    +unload_all_instances()
    +enum_supported_formats()
  }
  class VividInstance {
    +int instance_id
    +String device_name
    +String v4l2_device
    +String video_nodes
    +String controls
    +initialize_instance()
    +create_video_nodes()
    +register_with_v4l2()
    +cleanup()
  }
  class VideoNode {
    +int node_index
    +String node_name
    +String buffer_type
    +String video_device
    +String buffer_queue
    +open()
    +close()
    +ioctl()
    +poll()
    +queue_buffer()
  }
  class VideoCaptureNode {
      +String input_type
      +int input_index
      +String format
      +bool streaming_active
      +set_input()
      +set_format()
      +get_format()
      +request_buffers()
      +start_streaming()
      +stop_streaming()
      +dequeue_buffer()
  }
  class VideoOutputNode {
      +String output_type
      +int output_index
      +String format
      +bool output_active
      +set_output()
      +set_format()
      +get_format()
      +request_buffers()
      +start_output()
      +stop_output()
      +dequeue_buffer()
  }
  class HDMIInput {
      +bool hdmi_capable
      +String supported_resolutions
      +String timings
      +bool hotplug_detect
      +query_timings()
      +set_timings()
      +get_timings()
      +subscribe_event()
  }
  class HDMIOutput {
      +bool hdmi_sink_capable
      +String supported_resolutions
      +String timings
      +bool edid_present
      +set_timings()
      +get_timings()
      +set_edid()
  }
  class FrameBufferMedium {
      +String memory_buffer
      +int buffer_size
      +int width
      +int height
      +String pixel_format
      +int stride
      +allocate_buffers()
      +map_to_userspace()
      +copy_frame()
      +apply_scaling()
      +convert_format()
  }
  class VividBuffer {
      +int index
      +String virtual_address
      +String dma_address
      +int length
      +String state
      +String timestamp
      +prepare()
      +finish()
      +queue()
  }
  class BufferQueue {
      +String buffers
      +String memory_type
      +int allocated_count
      +int queued_count
      +init_queue()
      +queue_buffer()
      +dequeue_buffer()
      +stream_on()
      +stream_off()
  }
  class ModuleParameters {
      +int node_types
      +int num_inputs
      +int num_outputs
      +int input_types
      +int output_types
      +int capabilities
      +bool vivid_debug
      +parse_params()
      +validate_params()
      +apply_to_instance()
  }
VividKernelModule --> VividInstance : manages
VividInstance --> VideoNode : contains
VideoNode <|-- VideoCaptureNode
VideoNode <|-- VideoOutputNode
VideoCaptureNode --> HDMIInput : optional
VideoOutputNode --> HDMIOutput : optional
VideoCaptureNode --> FrameBufferMedium : writes
VideoNode --> BufferQueue : manages
BufferQueue --> VividBuffer : contains
VividInstance --> ModuleParameters : configured_by
```

```mermaid
sequenceDiagram
    participant App as User App
    participant VIn as /dev/video0
    participant V4L2 as V4L2 Core
    participant VDev as video_device
    participant SubDev as v4l2_subdev
    participant I2C as I2C Module
    participant Sensor as Sensor Chip
    participant Cap as Capture HW
    participant Disp as Display HW
    participant VOut as /dev/video1
    App->>VIn: open()
    VIn->>VDev: file_open
    VDev->>V4L2: register access
    App->>VIn: ioctl(QUERYCAP)
    V4L2-->>App: capabilities
    App->>VIn: ioctl(S_FMT)
    VDev->>SubDev: set_format()
    SubDev->>I2C: configure sensor
    I2C->>Sensor: write registers
    App->>VIn: ioctl(REQBUFS)
    VDev->>Cap: allocate buffers
    App->>VIn: STREAMON
    Cap->>Sensor: start capture
    Sensor-->>Cap: video frames
    Cap-->>VDev: frame buffers
    VDev-->>App: dequeue buffer
    VDev->>Disp: send frames
    Disp->>VOut: output video
```

```mermaid
gitGraph:
    commit id: "Power On"
    branch HW
    checkout HW
    commit id: "Sensor init"
    commit id: "PLL lock" tag: "clock-stable"
    branch KS
    checkout KS
    commit id: "v4l2_device register"
    commit id: "video_device create" tag: "dev/video0"
    branch US
    checkout US
    commit id: "open(/dev/video0)" tag: "fd-ok"
    commit id: "ioctl QUERYCAP" tag: "V4L2_CAP_VIDEO_CAPTURE"
    checkout KS
    commit id: "ioctl dispatch"
    commit id: "subdev call: s_fmt" tag: "format-set"
    checkout HW
    commit id: "sensor reprogram"
    commit id: "stream enable"
    checkout KS
    commit id: "vb2 queue setup" tag: "buffers-ready"
    checkout US
    commit id: "STREAMON" tag: "capture-start"
    checkout HW
    commit id: "DMA frame"
    commit id: "IRQ raise"
    checkout KS
    commit id: "frame dequeue" tag: "buffer-done"
    checkout US
    commit id: "userspace read()" tag: "frame-visible"
```

## Capability definition (static, once)
```mermaid
gitGraph:
    commit id: "init"
    branch HW
    checkout HW
    commit id: "sensor_power_on" tag: "PWR 01" type: HIGHLIGHT 
    commit id: "sensor_stream_on" tag: "STREAM 02" type: HIGHLIGHT
    commit id: "dma_frame_ready" tag: "IRQ" type: REVERSE
    checkout main
    merge HW
    branch KS
    checkout KS
    commit id: "video_device_register" 
    commit id: "ioctl_querycap" tag: "CAP_VIDEO_CAPTURE" type: REVERSE
    commit id: "ioctl_s_fmt" tag: "FMT_SET" type: REVERSE
    commit id: "vb2_reqbufs" type: REVERSE
    commit id: "vb2_streamon" type: REVERSE
    commit id: "vb2_dqbuf" 
    checkout main
    merge KS
    branch US
    checkout US
    commit id: "open_device" type:HIGHLIGHT tag: "03"
    commit id: "ioctl_QUERYCAP" type: REVERSE
    commit id: "ioctl_S_FMT" type:HIGHLIGHT tag: "04"
    commit id: "ioctl_REQBUFS" type: REVERSE
    commit id: "ioctl_STREAMON" type: REVERSE
    commit id: "read_frame" type: HIGHLIGHT tag: "05"
    checkout main
    merge US
    checkout main
 
```
