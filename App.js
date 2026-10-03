import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, Pressable, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import  Ionicons  from '@react-native-vector-icons/ionicons';
import MapView, {Marker } from 'react-native-maps';
import { useState } from 'react';
import { getClammingRecommendation } from './clamfind.js';
import { getCrabbingRecommendation } from './crabfind.js';
import { formatDate, formatTime, parseStationDate, getStationTimeZone } from './date.js';

export default function App() {
  const [address, setAddress] = useState('');
  const [activity, setActivity] = useState('clamming');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleSearch() {
    Keyboard.dismiss();
    setLoading(true);
    setResult(null);
    

    try {
        let data;
        if (activity === 'clamming') {
            data = await getClammingRecommendation(address);
        } else {
            data = await getCrabbingRecommendation(address);
        }
        setResult(data);
    } catch (error) {
        setResult({ error: error.message });
    }

    setLoading(false);
}

let recommendationTime;
let alternateRecommendations;
if (result?.recommendation) {
  if (activity === 'clamming') {
    recommendationTime = result.recommendation?.when;
    alternateRecommendations = result.recommendation.alternateTimes;
  } else if (activity === 'crabbing') {
    recommendationTime = `${result.recommendation?.windowStart} - ${result.recommendation.windowEnd}`;
    alternateRecommendations = result.recommendation.alternateWindows;
  }
}


  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView style={styles.container}keyboardShouldPersistTaps="handled">
        <View style= {styles.header}>
          {/* need to add graphics for some buttons*/}
          <Text style={styles.title}>Clam & Crab Finder</Text> 
          <Text style={styles.subtitle}>Find the best time and place for clamming or crabbing near you!</Text>
        </View>


      {/* adress input box */}
      <View style={styles.inputContainer}> 
        <Ionicons name="location-outline" size={22} color="#52727A"/>
        <TextInput
          style={styles.input}
          placeholder="Enter your address"
          placeholderTextColor="#7B9298"
          value={address}
            onChangeText={setAddress}
            />
      </View>

        <Text style={styles.sectionTitle}>
          What are you looking for?
        </Text>

        <View style={styles.activityRow}>

          <Pressable
            style={[
              styles.activityCard,
              activity === 'clamming' && styles.activityCardSelected
            ]}
            onPress={() => {setActivity('clamming'); setResult(null);}}
          >
            <Text style={styles.activityText}>Clamming</Text>
          </Pressable>

          <Pressable
            style={[
              styles.activityCard,
              activity === 'crabbing' && styles.activityCardSelected
            ]}
            onPress={() => {setActivity('crabbing'); setResult(null);}}
          >
              <Text style={styles.activityText}>Crabbing</Text>
          </Pressable>

        </View>

        <Pressable
          style={[
            styles.searchButton,
            loading && styles.searchButtonDisabled
          ]}
          onPress={handleSearch}
          disabled={loading}
        >
          <Text style={styles.searchButtonText}>{loading ? 'Searching...' : 'Find Best Times'}</Text>
        </Pressable>


        {loading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>
              Searching tides and conditions...
            </Text>
          </View>
        )}


        {result && result.recommendation && (
          <>
            <View style={styles.resultCard}>
              <Text style={styles.resultHeading}>Recommended Beach</Text>
              <Text style={styles.resultBeach}>{result.recommendation.beach}</Text>
              <Text style={styles.resultDate}>
                You should go on {result.recommendation.date} at this time: {recommendationTime}
              </Text>
              <View style={styles.divider} />

              <Text style={styles.resultSubheading}>Alternate Tide Windows</Text>
              {alternateRecommendations?.map((alt, index) => {
                    if (activity === 'clamming') {
                      return (
                        <Text key={index} style={styles.resultAlternateDate}>
                          {formatDate(alt.dateTime)} at {formatTime(alt.dateTime)} 
                        </Text>
                    );
                  }
                
                    if (activity === 'crabbing') {
                      return (
                      <Text key={index} style={styles.resultAlternateDate}>
                        {formatDate(alt.start)} from {formatTime(alt.start)} to {formatTime(alt.end)}
                      </Text>
                    );
                  }
              })}
           
            </View>

            <MapView
              style={styles.map}
              initialRegion={{
                latitude: result.recommendation.lat,
                longitude: result.recommendation.lng,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              <Marker
                coordinate={{
                  latitude: result.recommendation.lat,
                  longitude: result.recommendation.lng,
                }}
                title={result.recommendation.beach}
                description={result.recommendation.label}
              />
            </MapView>
          </>
        )}


        {result && result.message && <Text style={styles.message}>{result.message}</Text>}
        
        {result && result.error && <Text style={styles.error}>Error: {result.error}</Text>}

        {result && (
          <Text>
            {JSON.stringify(result, null, 2)}
          </Text>
        )}

        <StatusBar style="auto" />
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAF4F6',
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  header: {
    alignItems: 'center',
    marginBottom: 25,
  },
  
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#164E63',
  },
  
  subtitle: {
    fontSize: 15,
    color: '#52727A',
    marginTop: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
    marginBottom: 20,
  
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  
    elevation: 3,
  },
  
  input: {
    flex: 1,
    fontSize: 16,
    paddingLeft: 10,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#52727A',
    marginBottom: 10,
  },
  
  activityRow: {
    flexDirection: 'row',
    gap: 12,
  },
  
  activityCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  
  activityCardSelected: {
    backgroundColor: '#D4EDF2',
    borderColor: '#1E6F8C',
  },
  
  activityIcon: {
    fontSize: 35,
  },
  
  activityText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#164E63',
    marginTop: 8,
  },

  searchButton: {
    backgroundColor: '#1E6F8C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  
  searchButtonDisabled: {
    opacity: 0.5,
  },
  
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  loadingContainer: {
    alignItems: 'center',
    marginTop: 15,
  },
  
  loadingText: {
    color: '#52727A',
    fontSize: 14,
  },

  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    marginTop: 25,
  
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  
    elevation: 4,
  },
  
  resultHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#52727A',
    letterSpacing: 1,
  },
  
  resultSubheading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#52727A',
    letterSpacing: 1,
  },

  
  resultBeach: {
    fontSize: 20,
    fontWeight: '700',
    color: '#164E63',
    marginTop: 8,
  },
  
  divider: {
    height: 1,
    backgroundColor: '#DCE7EA',
    marginVertical: 15,
  },
  
  resultLabel: {
    fontSize: 25,
    fontWeight: '800',
    color: '#1E6F8C',
  },
  
  resultDate: {
    fontSize: 17,
    color: '#52727A',
    marginTop: 5,
  },
  
  resultAlternateDate: {
    fontSize: 14,
    color: '#52727A',
    marginTop: 5,
  },


  resultWhen: {
    fontSize: 17,
    color: '#52727A',
    marginTop: 5,
  },

  message: {
    marginTop: 20,
    color: '#52727A',
    textAlign: 'center',
  },
  
  error: {
    marginTop: 20,
    color: '#B42318',
    textAlign: 'center',
  },

  map: {
    width: '100%',
    height: 300,
    marginTop: 20,
    borderRadius: 18,
  },

});