import { useNavigation } from '@react-navigation/native';
import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Image, FlatList } from 'react-native';
import { StackTypes } from '../../routes/stack';
import { AntDesign, SimpleLineIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, onSnapshot, query, orderBy, where, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import axios from 'axios';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { URL, URLF } from '../config/index'

type UserDetails = {
  uid: string;
};


type GroupProps = {
  nomeGrupo: string, 
  dataRevelacao: string, 
  qtdMax: string, 
  descricao: string, 
  handleNavegarConvite: (nomeDoGrupo: string, groupId: string) => void, 
  handleNavegarParticipantes:(groupId: string) => void, 
  handleAtualizarGrupo: (groupId: string) => void,
  handleSortear: (groupId: string, admin:boolean) => void,
  handleBuscarPar: (groupId: string) => Promise<any>;
  nomeDoGrupo: string,
  image: string,
  groupId: string,
  adminUid: string,
  userDatail: any,
};

type Par = {
  avatarUrl: string | null;
  sorteado: boolean;
  email: string;
  nome: string;
  sobrenome: string;
};

const GroupComponent: React.FC<GroupProps> = ({
  groupId,
  nomeGrupo,
  dataRevelacao,
  qtdMax,
  descricao,
  handleNavegarConvite,
  nomeDoGrupo,
  image,
  handleNavegarParticipantes,
  handleAtualizarGrupo,
  handleSortear,
  handleBuscarPar,
  adminUid,
  userDatail,
}) => {
  const [meuPar, setMeuPar] = useState<Par | null>(null);

  useEffect(() => {
    const buscarMeuPar = async () => {
      try {
        const parEncontrado = await handleBuscarPar(groupId);
        setMeuPar(parEncontrado);
      } catch (error) {
        console.error('Erro ao buscar par:', error);
      }
    };

    buscarMeuPar();
  }, [groupId]);

  return (
    <View style={styles.nomeGrupocontainer}>
      <TouchableOpacity 
        onPress={() => { handleSortear(groupId, (adminUid===userDatail?.uid ? true : false)) }}
        style={styles.buttonIconSorteio} 
        activeOpacity={0.1}>
        <Image style={styles.imageStyle} source={{ uri: image }}  />
      </TouchableOpacity>
      <View style={styles.grupo}>
        <Text style={styles.nomeGrupo}>{nomeGrupo}</Text>
        <Text>
          <Text style={styles.text}>Descrição:</Text> {descricao}
        </Text>
        <Text>
          <Text style={styles.text}>Data Revelação:</Text> {dataRevelacao}
        </Text>
        <Text>
          <Text style={styles.text}>Quantidade Max:</Text> {qtdMax}
        </Text>
        <Text>
          <Text style={styles.text}>Seu par:</Text> {meuPar ? meuPar.nome : 'Grupo não sorteado'}
        </Text>
      </View>
      <View>
        {adminUid===userDatail?.uid && (<TouchableOpacity 
          onPress={() => { handleAtualizarGrupo(groupId) }}
          style={styles.buttonIcon} 
          activeOpacity={0.1}>
          <AntDesign name="edit" size={25} color="black" />
        </TouchableOpacity>)}
        <TouchableOpacity
          onPress={() => handleNavegarConvite(nomeDoGrupo, groupId)}
          style={styles.buttonIcon}
          activeOpacity={0.1}
        >
          <SimpleLineIcons name="envelope" size={25} color="black" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleNavegarParticipantes(groupId)} style={styles.buttonIcon} activeOpacity={0.1}>
          <AntDesign name="team" size={25} color="black" />
        </TouchableOpacity>
      </View>
    </View>
  );
};



const ListaGrupos = () => {
  const navigation = useNavigation<StackTypes>();
  const [userDatail, setUserDatail] = useState<UserDetails | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [message, setMessage] = useState<string>('Clique na foto do grupo para sortear');
  const [pares, setPares] = useState<any[]>([]);
  

  const copyToClipboard = async (link: string) => {
    const textToCopy = link;
    await Clipboard.setStringAsync(textToCopy);
  };

  const handleNavegarHome = () => {
    navigation.navigate('Home');
  };

  const handleNavegarConvite = (nomeGrupo: string, groupId: string) => {
    const inviteLink = `${URLF}Convites/${groupId}/${nomeGrupo}`;
    copyToClipboard(inviteLink);
    navigation.navigate('Convites', { nome: nomeGrupo, groupId: groupId } as unknown as {nome:string, groupId:string});
  };

  const handleAtualizarGrupo = (groupId: string) => {
    navigation.navigate('AtualizarGrupo', { groupId: groupId } as unknown as {groupId:string});
  };

  const handleNavegarParticipantes = (groupId: string) => {
    navigation.navigate('ListaParticipantes', { groupId });
  };

  const userLoggedIn = () => {
    AsyncStorage.getItem('@user').then((value) => {
      if (value !== null) {
        const user = JSON.parse(value);
        setUserDatail(user);
      }
    });
  };

  async function handleSortear(groupId: string, admin: boolean){
    if (admin) {
      try {
        const response = await axios.post(`${URL}groups/sortear`, {
          groupId
        });
    
        if (response.status === 200) {
          setMessage('Grupo sorteado com sucesso! ');
          handleNavegarHome();
        } else {
          setMessage('Erro ao sortear grupo: ' + response.data);
        }
      } catch (error: any) {
        if (error.response) {
          setMessage('Erro ao sortear grupo: ' + error.response.data);
        } else if (error.request) {
          setMessage('Erro ao aguardar resposta do servidor: ' + error.request);
        } else {
          setMessage('Erro inesperado ao sortear grupo: ' + error.message);
        }
      }
    } else {
      setMessage('Apenas o administrador do grupo pode realizar o sorteio! ');
    }
  }

  async function handleBuscarPar(groupId: string) {
    try {
      const response = await axios.post(`${URL}groups/getGroupById`, { groupId });

      if (response.status === 200) {
        setPares(response.data.pares);

        let parUid = null;
        if(response.data.pares){
          for (let i = 0; i < response.data.pares.length; i++) {
            if (response.data.pares[i].participant1 === userDatail?.uid) {
              parUid = response.data.pares[i].participant2;
              break;
            } else if (response.data.pares[i].participant2 === userDatail?.uid) {
              parUid = response.data.pares[i].participant1;
              break;
            }
          }
        }

        if (parUid) {
          const parResponse = await axios.post(`${URL}api/getUserByUid`, { uid: parUid });

          if (parResponse.status === 200) {
            return(parResponse.data);
          } else {
            console.error('Erro ao buscar o par: ', parResponse.data);
          }
        } else {
          console.log('Par não encontrado.');
        }
      } else {
        console.log('Erro ao buscar pares: ', response.data);
      }
    } catch (error: any) {
      console.log('Erro ao buscar pares: ', error.message);
    }
  }

  useEffect(() => {
    userLoggedIn();
  }, []);

  useEffect(() => {
    if (userDatail) {
      try {
        const loadGroups = async () => {
          const response = await axios.post(`${URL}groups/getGroupList`, {
            userDatail
          });

          if(response.status === 200) {
            setGroups(response.data);
          }else{
            console.log('Erro ao listar grupos: ', response.data);
          }
        };

        loadGroups();
      } catch (error: any) {
        console.log('Erro ao listar grupo:', error.message);
      }

    }
  }, [userDatail]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lista de Grupos</Text>
      <Text style={styles.subtitle}>{message}</Text>

      <FlatList
        data={groups}
        renderItem={({ item }) => (
          <GroupComponent
            groupId={item.groupId}
            nomeGrupo={item.nome}
            descricao={item.descricao}
            dataRevelacao={item.dataRevelacao}
            qtdMax={item.qtdMax}
            handleNavegarConvite={handleNavegarConvite}
            handleAtualizarGrupo={handleAtualizarGrupo}
            nomeDoGrupo={item.nome}
            image={item.image}
            handleNavegarParticipantes={handleNavegarParticipantes}
            handleSortear={handleSortear}
            handleBuscarPar={() => handleBuscarPar(item.groupId)}
            adminUid={item.adminUid}
            userDatail={userDatail}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
      />

      <TouchableOpacity onPress={handleNavegarHome} style={styles.button} activeOpacity={0.1}>
        <Text style={styles.buttonText}>Home</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8a2be2',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 50,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  nomeGrupocontainer: {
    width: '70%',
    minWidth: 350,
    height: 120,
    borderColor: '#D3A46F',
    backgroundColor: '#f8dcff',
    borderWidth: 1,
    borderRadius: 20,
    marginBottom: 10,
    textAlign: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  grupo: {
    marginLeft: 10,
    marginTop: 10,
    width: '70%',
    textAlign: 'left',
    color: '#5C3A21',
    height: 120,
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  nomeGrupo: {
    fontWeight: 'bold',
    fontSize: 17,
  },
  text: {
    fontWeight: '500',
  },
  button: {
    width: '80%',
    height: 50,
    borderRadius: 20,
    backgroundColor: '#6600CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#2D2926',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  buttonText: {
    color: '#FFF7EB',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonIcon: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    marginTop: 0,
  },
  buttonIconSorteio: {
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageStyle: {
    borderColor: '#D3A46F',
    borderWidth: 1,
    width: 70,
    height: 70,
    alignSelf: 'center',
    borderRadius: 50,
    marginLeft: 10,
  },
});

export default ListaGrupos;