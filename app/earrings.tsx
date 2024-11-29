import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  Camera as VisionCamera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Camera, Face, FaceDetectionOptions } from 'react-native-vision-camera-face-detector';
import { Canvas, Image as SkiaImage, Skia, SkImage, Rect } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { useIsFocused } from '@react-navigation/native';
import { Redirect } from 'expo-router';

const Earrings = () => {
  return (
    <SafeAreaProvider>
      <FaceDetection />
    </SafeAreaProvider>
  );
};

function FaceDetection(): JSX.Element {
  const { width, height } = useWindowDimensions();
  const isFocused = useIsFocused();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraMounted, setCameraMounted] = useState<boolean>(false);

  const [selectedEarring, setSelectedEarring] = useState<any>(
    require('../assets/images/ear9.png')
  );
  const [earringPositions, setEarringPositions] = useState([
    { x: 0, y: 0 }, // Left ear
    { x: 0, y: 0 }, // Right ear
  ]);
  const [earringSize, setEarringSize] = useState({ width: 50, height: 100 });

  const [originalEarringDimensions, setOriginalEarringDimensions] = useState({
    width: 1,
    height: 1,
  });

  const [skiaImage, setSkiaImage] = useState<SkImage | null>(null);

  useEffect(() => {
    if (!isFocused) {
      setCameraMounted(false);
    }
  }, [isFocused]);

  // Load Skia image for earrings
  useEffect(() => {
    const loadEarringSkiaImage = async () => {
      try {
        const asset = Asset.fromModule(selectedEarring);
        await asset.downloadAsync();

        const imageData = await FileSystem.readAsStringAsync(
          asset.localUri || asset.uri,
          { encoding: FileSystem.EncodingType.Base64 }
        );

        const skiaData = Skia.Data.fromBase64(imageData);
        const image = Skia.Image.MakeImageFromEncoded(skiaData);
        if (image) {
          setOriginalEarringDimensions({
            width: image.width(),
            height: image.height(),
          });
          setSkiaImage(image);
        }
      } catch (error) {
        console.error('Failed to load the earring image:', error);
      }
    };

    loadEarringSkiaImage();
  }, [selectedEarring]);

  const faceDetectionOptions = useRef<FaceDetectionOptions>({
    performanceMode: 'fast',
    classificationMode: 'all',
    windowWidth: width,
    windowHeight: height,
  }).current;

  const cameraDevice = useCameraDevice('front');
  const camera = useRef<VisionCamera>(null);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  const handleFacesDetected = (faces: Face[]) => {
    if (faces.length > 0) {
      const face = faces[0];
      const { x: faceX, y: faceY, width: faceWidth, height: faceHeight } =
        face.bounds;

      // Estimate left ear position
      const leftEarX = faceX - 90; 
      const leftEarY = faceY + faceHeight / 2 + 20;

      // Estimate right ear position
      const rightEarX =  faceWidth + leftEarX;
      const rightEarY = faceY + faceHeight / 2 + 20;

      setEarringPositions([
        { x: leftEarX, y: leftEarY },
        { x: rightEarX, y: rightEarY },
      ]);

      // Set earring size based on face height
      const earringHeight = faceHeight / 3;
      const earringWidth =
        earringHeight *
        (originalEarringDimensions.width / originalEarringDimensions.height);
      setEarringSize({ width: earringWidth, height: earringHeight });
    }
  };

  const handleImageSelect = (image: any) => {
    setSelectedEarring(image);
  };

  if (!hasPermission) return <Redirect href={'/permissions'} />;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        Face a light source, align your face, and tuck your hair behind your ears.
      </Text>
      {hasPermission && cameraDevice ? (
        <>
          <Camera
            ref={camera}
            style={StyleSheet.absoluteFill}
            isActive={cameraMounted}
            device={cameraDevice}
            onError={(error) => console.error('Camera error:', error)}
            faceDetectionCallback={handleFacesDetected}
            faceDetectionOptions={faceDetectionOptions}
          />
          <Canvas style={styles.canvas}>
            {skiaImage &&
              cameraMounted &&
              earringPositions.map((pos, index) => (
                 <SkiaImage
                    key={index}
                    image={skiaImage}
                    x={pos.x}
                    y={pos.y + 40}
                    width={earringSize.width}
                    height={earringSize.height}
                  />
              ))}
          </Canvas>
        </>
      ) : (
        <Text>No camera device or permission</Text>
      )}

      {/* Image selector to choose different earrings */}
      <View style={styles.imageSelector}>
        {[require('../assets/images/ear9.png'), require('../assets/images/ear7.png'), require('../assets/images/ear5.png'), require('../assets/images/ear6.png')].map(
          (image, index) => (
            <TouchableOpacity
              key={index}
              style={styles.earringWrapper}
              onPress={() => handleImageSelect(image)}
            >
              <Image source={image} style={styles.earringOption} />
            </TouchableOpacity>
          )
        )}
      </View>
      <View style={styles.controls}>
          {!cameraMounted && (
            <TouchableOpacity
              style={styles.controlsBtn}
              onPress={() => setCameraMounted((current) => !current)}
            >
              <Text
                style={{ color: "white", fontSize: 14, fontWeight: "700" }}
              >
                {cameraMounted ? "Stop" : "Start Try On"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heading: {
    position: 'absolute',
    zIndex: 20,
    top: 15,
    color: 'white',
    textAlign: 'center',
    width: '100%',
    fontSize: 14,
  },
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
  controls: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageSelector: {
    position: 'absolute',
    bottom: 10,
    left: '50%',
    transform: [{ translateX: -160 }],
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  earringWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
    borderRadius: 10,
    padding: 5,
    width: '21%',
  },
  earringOption: {
    width: '100%',
    height: 70,
    borderRadius: 10,
  },
  controlsBtn: {
    backgroundColor: '#588157',
    padding: 14,
    borderRadius: 8,
  },
});

export default Earrings;
