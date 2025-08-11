import React, { Component } from 'react';
import { View, FlatList, Text, Image, StyleSheet } from 'react-native';
import styles from '../assets/styles'

class SearchResults extends Component {
  render() {
    return (
      <View style={styles.searchContainer}>
        {this.props.productos.length > 0 ? (
          <FlatList
            data={this.props.productos}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <View style={styles.searchListItem}>
                <Image source={{ uri: item.imagen }} style={styles.searchImage} />
                <View style={styles.searchTextContainer}>
                  <Text style={styles.searchTextName}>{item.nombre}</Text>
                  <Text style={styles.searchSubTitle}>Categoría</Text>
                  <Text style={styles.searchTextCategory}>{item.categoria}</Text>
                  <Text style={styles.searchTextPrice}>RD${item.precio}.00</Text>
                </View>
              </View>
            )}
          />
        ) : (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>No se encontraron resultados.</Text>
          </View>
        )}
      </View>
    );
  }
}

export default SearchResults;
