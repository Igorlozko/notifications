import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Button, View, Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { init, insertItem, fetchItems } from './sql';

Notifications.setNotificationHandler({
  handleNotification: async () => {
    return {
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowAlert: true,
    };
  },
});

export default function App() {
  const [pushToken, setPushToken] = useState(null);
  const [isTokenLoading, setIsTokenLoading] = useState(true);

  useEffect(() => {
    init()
      .then(() => {
        console.log('Initialized database');
      })
      .catch(err => {
        console.log('Initializing db failed.');
        console.log(err);
      });

    async function configurePushNotifications() {
      const { status } = await Notifications.getPermissionsAsync();
      let finalStatus = status;

      if (finalStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission required',
          'Push notifications need the appropriate permissions.'
        );
        setIsTokenLoading(false);
        return;
      }

      const pushTokenData = await Notifications.getExpoPushTokenAsync();
      setPushToken(pushTokenData.data); // Store the push token
      setIsTokenLoading(false);
      console.log(pushTokenData);

      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
    }

    configurePushNotifications();
  }, []);

  useEffect(() => {
    const subscription1 = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('NOTIFICATION RECEIVED');
        console.log(notification);
        const userName = notification.request.content.data.userName;
        console.log(userName);
      }
    );

    const subscription2 = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('NOTIFICATION RESPONSE RECEIVED');
        console.log(response);
        const userName = response.notification.request.content.data.userName;
        console.log(userName);
      }
    );

    return () => {
      subscription1.remove();
      subscription2.remove();
    };
  }, []);

  async function scheduleNotificationHandler() {
    Notifications.scheduleNotificationAsync({
      content: {
        title: 'My first local notification',
        body: 'This is the body of the notification.',
        data: { userName: 'Max' },
      },
      trigger: {
        seconds: 5,
      },
    });
  }

  async function sendPushNotificationHandler() {
    console.log("Push Token:", pushToken);
    if (!pushToken) {
      console.error('Push token is not available.');
      return;
    }

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: pushToken,
          title: 'Test - sent from a device!',
          body: 'This is a push notification test!'
        })
      });
  
      if (!response.ok) {
        throw new Error('Failed to send push notification');
      }
  
      console.log('Push notification sent successfully');
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  return (
    <View style={styles.container}>
      <Button
        title="Schedule Notification"
        onPress={scheduleNotificationHandler}
      />
      <Button
        title="Send Push Notification"
        onPress={sendPushNotificationHandler}
        disabled={isTokenLoading || pushToken === null}
      />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
