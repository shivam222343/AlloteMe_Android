import React from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '../../constants/theme';

const blurhash = '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQipWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[';

const OptimizedImage = ({ source, style, transition = 500, contentFit = 'cover', placeholder }) => {
    return (
        <Image
            style={[styles.image, style]}
            source={source}
            placeholder={placeholder || blurhash}
            contentFit={contentFit}
            transition={transition}
            cachePolicy="memory-disk"
        />
    );
};

const styles = StyleSheet.create({
    image: {
        backgroundColor: '#f1f5f9',
    },
});

export default OptimizedImage;
