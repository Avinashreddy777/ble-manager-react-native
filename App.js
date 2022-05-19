/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useState , useEffect} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  NativeModules,
  NativeEventEmitter,
  Button,
  Platform,
  PermissionsAndroid,
  FlatList,
  TouchableHighlight,
} from 'react-native';

import {
  Colors,
} from 'react-native/Libraries/NewAppScreen';
import { stringToBytes } from 'convert-string';

import BleManager from 'react-native-ble-manager'
import convertString from 'convert-string';
import { bytesToString } from 'convert-string';

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule)

//https://stackoverflow.com/questions/68361333/reactnative-ble-manager-is-not-reading-data-from-peripheral-on-ios
const App = (props) => {

  const [isScanning, setIsScanning] = useState(false)
  const peripherals = new Map();
  const [list, setList] = useState([]);
  const [connectedDevices, setConnectedDevices ] = useState([ ]);
  const [permissionsAllowed, setPermissionsAllowed ] = useState(false)
  const [writePermission, setWritePermission ] = useState(false)
  const [readPermission, setReadPermission ] = useState(false)
  const [readData ,setReadData] = useState([])
  const [sensorData,setSensorData] = useState([])

  const myData = "HI helloooo"

  const startScan = ()=>{
    if(!isScanning){
      BleManager.scan([],3,true).then(()=>{
        console.log("scanning.....")
        setIsScanning(true)
      }).catch((error)=>{
        console.error(error)
      })
    }
  }

  const handleStopScan=()=>{
    console.log("scanning is stopped!")
    setIsScanning(false)
  }

  const handleDisconnectedPeripheral = (data)=>{
    let peripheral = peripherals.get(data.peripheral)
    if(peripheral){
      peripheral.connected = false;
      peripherals.set(peripheral.id,peripheral)
      setList(Array.from(peripherals.values()))
    }
    console.log("Disconned from : ",data.peripheral)
  }

  const handleUpdateValueForCharacteristic = (data) => {
    if (!data.value) {
      return;
    }
    
    console.log("received ble data : ",bytesToString(data.value))
    // const value = decode(data.value);
    // console.log("value : ",value)
    // var receivedDataFromBle = ""
    // for(var i = 0 ; value.length ; i++){
    //    receivedDataFromBle = value.concat(value)
    // }
    //  console.log(receivedDataFromBle)
    //  this.setState({ sensorData: receivedDataFromBle });
  }

   const encode = (string) => {
    const utf8encoder = new TextEncoder('utf-8');
    return utf8encoder.encode(string);
  }
   const decode = (arr) => {
    const utf8decoder = new TextDecoder('utf-8');
    const utf8Arr = new Uint8Array(arr);
    return utf8decoder.decode(utf8Arr);
  };
  const retrieveConnected=()=>{
    BleManager.getConnectedPeripherals([]).then((results)=>{
      if(results.length === 0 ){
        console.log("No Connected Peripherals")
      }
      console.log("result : ",results)
      for(var i =0 ; i < results.length ; i++){
        var peripheral = results[i]
        peripheral.connected = true
        peripherals.set(peripheral.id,peripheral)
        setList(Array.from(peripherals.values()))
      }
    })
  }

  const handleDiscoverPeripheral = (peripheral)=>{
    console.log("Got ble peripheral : ",peripheral)
    if(!peripheral.name){
      peripheral.name = 'NO NAME'
    }
    peripherals.set(peripheral.id,peripheral)
    setList(Array.from(peripherals.values()))
  }

  const isConnected = (peripheral)=>{
    return connectedDevices.filter(cd => cd.id === peripheral.id).length > 0;
  }

  const toggleConnectPeripheral = (peripheral) =>{
    if(peripheral){
      if(isConnected(peripheral)){
        BleManager.disconnect(peripheral.id)
        setConnectedDevices(connectedDevices.filter(cd => cd.id != peripheral.id))
      }else{
        BleManager.connect(peripheral.id).then(()=>{
          let tempConnectedDevices = [...connectedDevices]
          tempConnectedDevices.push(peripheral)
          setConnectedDevices(tempConnectedDevices)
          //props.navigation.push('BleRowingSession', { peripheral : peripheral})
          let p = peripherals.get(peripheral.id)
          if(p){
            p.connected = true
            peripherals.set(peripheral.id, p)
            setList(Array.from(peripherals.values()))

            //props.navigation.push('BleDeviceServiceList', {peripheral : peripheral})
          }

          BleManager.retrieveServices(peripheral.id).then((peripheralInfo)=>{

            console.log("retrived peripheral Info : ",peripheralInfo)
              let service = peripheralInfo.characteristics[1].service
              let characteristic = peripheralInfo.characteristics[1].characteristic
              let readService = peripheralInfo.characteristics[0].service
              let readChartectstics = peripheralInfo.characteristics[0].characteristic

              let androidService = peripheralInfo.characteristics[5].service
              let androidCharterStic = peripheralInfo.characteristics[5].characteristic
              let androidReadService = peripheralInfo.characteristics[4].service
              let androidReadCharacterStics = peripheralInfo.characteristics[4].characteristic
              console.log("writePermission : ",writePermission)
              if(Platform.OS === 'android'){
                setTimeout(()=>{
                  if(writePermission)
                  writeData(myData,peripheral,androidService,androidCharterStic,androidReadService,androidReadCharacterStics)
                    else{
                      requestPermission()
                    }
                },5000)
              }
            if(Platform.OS === 'ios')  {
              setTimeout(()=>{
                if(writePermission)
                  writeData(myData ,peripheral,service,characteristic,readService,readChartectstics)
                  else{
                    requestPermission()
                  }
              },5000)
            }
              
          })
          console.log("connected to ",peripheral.id)
        }).catch((err)=>{
          console.log('connection error : ',err)
        })
      }
    }
  }

  const writeData=(stringMessage , peripheral , service ,characteristic,readService,readChartectstics)=>{
    console.log("service UUID : ",service , "characterstic : ",characteristic , "peripheral id : ",peripheral.id)
      let data = stringToBytes(stringMessage)
      BleManager.write(peripheral.id,service , characteristic,data).then(()=>{
        console.log("writed : ",stringMessage)
        setTimeout(()=>{
            readBleData(peripheral,readService,readChartectstics)
        },5000)
      }).catch((err)=>{
        console.log("unable to write data : ",err)
      })
  }

  const readBleData = (peripheral,readService,readChartectstics)=>{
    console.log("read service UUID : ",readService , "read characterstic : ",readChartectstics , "peripheral id : ",peripheral.id)
    BleManager.connect(peripheral.id).then(()=>{
      BleManager.startNotification(peripheral.id,readService,readChartectstics).then(()=>{
        BleManager.retrieveServices(peripheral.id).then((periPheralInfo)=>{
          console.log("peripheral Info : ",periPheralInfo)
          BleManager.read(periPheralInfo.id,periPheralInfo.characteristics[0].service , periPheralInfo.characteristics[0].characteristic).then((data)=>{
            //console.log("read data : ",data)
            let receivedData = bytesToString(data);
            console.log("received data : ",receivedData)
        })
        })
       // bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic',handleUpdateValueForCharacteristic)
      })
   })
  }
  useEffect(()=>{
    console.log("useEffect()")
    BleManager.start({showAlert : false})
    bleManagerEmitter.addListener('BleManagerDiscoverPeripheral',handleDiscoverPeripheral)
    bleManagerEmitter.addListener('BleManagerStopScan',handleStopScan)
    bleManagerEmitter.addListener('BleManagerDisconnectPeripheral',handleDisconnectedPeripheral)
    bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic',handleUpdateValueForCharacteristic)
    if(Platform.OS === 'android' && Platform.Version >= 23){
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then((result)=>{
        if(result){
          console.log("permission Ok")
          setPermissionsAllowed(true)
        }else{
          PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then((result)=>{
            if(result){
              console.log("permission accepted :")
              setPermissionsAllowed(true)
            }else{
              setPermissionsAllowed(false)
            }
          })
        }
      })
    }
    else{
      setPermissionsAllowed(true)
    }
    return(()=>{
      console.log("unmount")
      bleManagerEmitter.emit('BleManagerDiscoverPeripheral',handleDiscoverPeripheral)
      bleManagerEmitter.emit('BleManagerStopScan', handleStopScan );
      bleManagerEmitter.emit('BleManagerDisconnectPeripheral', handleDisconnectedPeripheral );
      bleManagerEmitter.emit('BleManagerDidUpdateValueForCharacteristic', handleUpdateValueForCharacteristic );
    })
  },[])

  const renderConnectButton = (item) => {
    if (isConnected(item)) {
      return null
    }

    return (
      <Button
      title="Connect"
      onPress={() => {
          toggleConnectPeripheral(item)
      }}
      />
    )
  }

  const renderDisconnectButton = (item) => {
    if (!isConnected(item)) {
      return null
    }

    return (
      <Button
      title="Disconnect"
      onPress={() => {
        toggleConnectPeripheral(item)
      }}
      />
    )
  }

  const renderItem = (item) => {
    const color = item.connected ? 'green' : '#fff';
    return (
      <TouchableHighlight>
        <View style={[styles.row, {backgroundColor: color}]}>
          <Text style={{fontSize: 12, textAlign: 'center', color: '#333333', padding: 10}}>{item.name}</Text>
          <Text style={{fontSize: 10, textAlign: 'center', color: '#333333', padding: 2}}>RSSI: {item.rssi}</Text>
          <Text style={{fontSize: 8, textAlign: 'center', color: '#333333', padding: 2, paddingBottom: 20}}>{item.id}</Text>
          {renderConnectButton(item)}
          {renderDisconnectButton(item)}
        </View>
      </TouchableHighlight>
    );
  }

  const requestReadPermission = async ()=>{
    if(Platform.OS === 'android' && Platform.Version >= 23){
        var granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,{
          title : 'Ble manger read Permission',
          message : 'Ble Manger Application want read '
        })
        if(granted === PermissionsAndroid.RESULTS.GRANTED){
          setReadPermission(true)
        }else{
          setReadPermission(false)
        }
     }
    
  }
const requestWritePermission = async ()=>{
    if(Platform.OS === 'android' && Platform.Version >= 23){
        var granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,{
          title : 'Ble manger Write Permission',
          message : 'Ble Manger Application want write'
        })
        if(granted === PermissionsAndroid.RESULTS.GRANTED){
          setWritePermission(true)
        }else{
          setWritePermission(false)
        }
     }
    
  }
  const requestPermission = async ()=>{
    if(Platform.OS === 'android' && Platform.Version >= 23){
        var granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,{
          title : 'Ble manger Location Permission',
          message : 'Ble Manger Application want know your location'
        })
        if(granted === PermissionsAndroid.RESULTS.GRANTED){
          setPermissionsAllowed(true)
        }else{
          setPermissionsAllowed(false)
        }
      //  var permissionResult =  await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,)
      //   // [PermissionsAndroid.PERMISSIONS.CAMERA, 
      //   // PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
      //   // PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      //   // PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      //   // PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      //   // PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE])
      //   console.log("permission Result : ",permissionResult)
     }
    
  }

  const renderContent = () => {
    console.log("renderContent()")
    requestPermission()
    requestWritePermission()
    if (!permissionsAllowed && !writePermission) {
      return <Text>Bluetooth and locations permissions are required.</Text>
    }

    console.log("bleSensorData : ",sensorData)
    return (
        <>
          <StatusBar barStyle="dark-content" />
          <SafeAreaView style={{flex : 1}}>
            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                style={styles.scrollView}>
              {global.HermesInternal == null ? null : (
                  <View style={styles.engine}>
                    <Text style={styles.footer}>Engine: Hermes</Text>
                  </View>
              )}
              <View style={styles.body}>

                <View style={{margin: 10}}>
                  <Button
                      title={'Scan Bluetooth (' + (isScanning ? 'on' : 'off') + ')'}
                      onPress={() => startScan() }
                  />
                </View>

                <View style={{margin: 10}}>
                  <Button title="Retrieve connected peripherals" onPress={() => retrieveConnected() } />
                </View>

                {(list.length == 0) &&
                <View style={{flex:1, margin: 20}}>
                  <Text style={{textAlign: 'center'}}>No peripherals</Text>
                </View>
                }

              </View>
            </ScrollView>
            <FlatList
                data={list}
                renderItem={({ item }) => renderItem(item) }
                keyExtractor={item => item.id}
            />
          </SafeAreaView>
        </>
    )
  }

return (
    renderContent()
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex:1,
    backgroundColor: Colors.lighter,
  },
  engine: {
    position: 'absolute',
    right: 0,
  },
  body: {
    flex : 1,
    backgroundColor: Colors.white,
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.black,
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
    color: Colors.dark,
  },
  highlight: {
    fontWeight: '700',
  },
  footer: {
    color: Colors.dark,
    fontSize: 12,
    fontWeight: '600',
    padding: 4,
    paddingRight: 12,
    textAlign: 'right',
  },
});

export default App;
