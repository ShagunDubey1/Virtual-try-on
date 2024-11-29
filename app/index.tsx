import {
  useEffect,
  useRef,
  useState
} from 'react';
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
import {
  Camera,
  Face,
  FaceDetectionOptions
} from 'react-native-vision-camera-face-detector';
import { Canvas, Image as SkiaImage, Skia, SkImage } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { useIsFocused } from '@react-navigation/native';
import { Redirect } from 'expo-router';

const HomeScreen = () => {
  return (
    <SafeAreaProvider>
      <FaceDetection />
    </SafeAreaProvider>
  );
}

function FaceDetection(): JSX.Element {
  const { width, height } = useWindowDimensions();
  const isFocused = useIsFocused();
  const { hasPermission } = useCameraPermission();
  const [cameraMounted, setCameraMounted] = useState<boolean>(false);

  const [selectedNecklace, setSelectedNecklace] = useState<any>(
    require("../assets/images/neck2.png")
  );
  const [necklacePosition, setNecklacePosition] = useState({ x: 100, y: 300 });
  const [necklaceSize, setNecklaceSize] = useState({ width: 150, height: 100 });
  const [originalNecklaceDimensions, setOriginalNecklaceDimensions] = useState({
    width: 0,
    height: 0,
  });

  const [skiaImage, setSkiaImage] = useState<SkImage | null>(null);

  useEffect(() => {
      if (!isFocused) {
        setCameraMounted(false);
      }
  }, [isFocused]);

  // Load Skia image
  useEffect(() => {
    const loadSkiaImage = async () => {
      try {
        const asset = Asset.fromModule(selectedNecklace);
        await asset.downloadAsync();

        const imageData = await FileSystem.readAsStringAsync(
          asset.localUri || asset.uri,
          { encoding: FileSystem.EncodingType.Base64 }
        );

        const skiaData = Skia.Data.fromBase64(imageData);
        const image = Skia.Image.MakeImageFromEncoded(skiaData);
        if (image) {
          setSkiaImage(image);

          // Retrieve original width and height of the image
          const originalWidth = image.width();
          const originalHeight = image.height();

          setOriginalNecklaceDimensions({
            width: originalWidth,
            height: originalHeight,
          });
        }
      } catch (error) {
        console.error("Failed to load the image:", error);
      }
    };

    loadSkiaImage();
  }, [selectedNecklace]);

  const faceDetectionOptions = useRef<FaceDetectionOptions>({
    performanceMode: "fast",
    classificationMode: "all",
    windowWidth: width,
    windowHeight: height,
  }).current;

  const cameraDevice = useCameraDevice("front");
  const camera = useRef<VisionCamera>(null);

  const handleFacesDetected = (faces: Face[]) => {
    if (faces.length > 0) {
      const face = faces[0];
      const { x: faceX, y: faceY, width: faceWidth, height: faceHeight } =
        face.bounds;

      const necklaceWidth = faceWidth * 1.2;
      const necklaceHeight =
        necklaceWidth *
        (originalNecklaceDimensions.height / originalNecklaceDimensions.width); // Maintain aspect ratio

      // Adjust the necklace position and size
      setNecklacePosition({
        x: faceX + faceWidth / 2 - necklaceWidth / 2 - 50,
        y: faceY + faceHeight + 50,
      });

      setNecklaceSize({
        width: necklaceWidth,
        height: necklaceHeight,
      });
    }
  };

  const handleImageSelect = (url: string) => {
    setSelectedNecklace(url);
  };

  if (!hasPermission) return <Redirect href={"/permissions"} />;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        Face a light source, align your face, and tuck your hair behind your
        ears.
      </Text>

      {hasPermission && cameraDevice ? (
        <>
          <Camera
            ref={camera}
            style={StyleSheet.absoluteFill}
            isActive={cameraMounted}
            device={cameraDevice}
            onError={(error) => console.error("Camera error:", error)}
            faceDetectionCallback={handleFacesDetected}
            faceDetectionOptions={faceDetectionOptions}
          />
          <Canvas style={styles.canvas}>
            {skiaImage && cameraMounted && (
              <SkiaImage
                image={skiaImage}
                x={necklacePosition.x}
                y={necklacePosition.y}
                width={necklaceSize.width}
                height={necklaceSize.height}
              />
            )}
          </Canvas>
        </>
      ) : (
        <Text>No camera device or permission</Text>
      )}

      <TouchableOpacity style={styles.earBtn}><Text style={{color: "white"}}>Earrings {"->"}</Text></TouchableOpacity>

      {/* Image selector to choose different necklaces */}
      <View style={styles.imageSelector}>
        <TouchableOpacity
          style={styles.neckWrapper}
          onPress={() =>
            handleImageSelect(require("../assets/images/neck4.png"))
          }
        >
          <Image
            source={require("../assets/images/neck4.png")}
            style={styles.necklaceOption}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.neckWrapper}
          onPress={() =>
            handleImageSelect(require("../assets/images/neck3.png"))
          }
        >
          <Image
            source={require("../assets/images/neck3.png")}
            style={styles.necklaceOption}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.neckWrapper}
          onPress={() =>
            handleImageSelect(require("../assets/images/neck2.png"))
          }
        >
          <Image
            source={require("../assets/images/neck2.png")}
            style={styles.necklaceOption}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.neckWrapper}
          onPress={() =>
            handleImageSelect(require("../assets/images/neck1.png"))
          }
        >
          <Image
            source={require("../assets/images/neck1.png")}
            style={styles.necklaceOption}
          />
        </TouchableOpacity>
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
  earBtn:{
    position: 'absolute',
    zIndex: 20,
    bottom: 110,
    right: 20,
  },
  heading: {
    position: 'absolute',
    zIndex: 20,
    top: 45,
    color: "white",
    textAlign: 'center',
    width: '100%',
    fontSize: 14,
  },
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
  controls: {
    flex: 1,
    alignItems: "center",
    flexDirection: 'row',
    justifyContent: 'center',
  },
  imageSelector: {
    position: 'absolute',
    bottom: 10,
    left: '50%',
    transform: [{ translateX: -160 }],
    flexDirection: 'row',
    gap: 10,
    width: '100%'
  },
  neckWrapper: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "white",
    borderRadius: 10,
    padding: 5,
    width: "21%",
  },
  necklaceOption: {
    width: "100%",
    height: 70,
    borderRadius: 10,
  },
  controlsBtn: {
    backgroundColor: "#588157",
    padding: 14,
    borderRadius: 8,
  }
});

export default HomeScreen;
